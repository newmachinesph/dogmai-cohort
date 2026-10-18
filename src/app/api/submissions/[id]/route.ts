import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/submissions/[id] - Get submission details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        assignment: {
          include: {
            cohort: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            module: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Students can only see their own submissions
    if (!isAdmin(user) && !isStaff(user) && submission.userId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Filter private comments for students
    if (!isAdmin(user) && !isStaff(user)) {
      submission.comments = submission.comments.filter(c => !c.isPrivate)
    }

    // Parse rubric if exists
    const formattedSubmission = {
      ...submission,
      assignment: {
        ...submission.assignment,
        rubric: submission.assignment.rubric ? JSON.parse(submission.assignment.rubric) : null
      }
    }

    return NextResponse.json({ submission: formattedSubmission })
  } catch (error) {
    console.error('Error fetching submission:', error)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }
}

// PUT /api/submissions/[id] - Update submission (student) or grade (staff)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.submission.findUnique({
      where: { id },
      include: { assignment: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Staff/Admin grading
    if (isAdmin(user) || isStaff(user)) {
      const { score, feedback, status } = body

      // Staff can only grade their assigned cohorts
      if (!isAdmin(user)) {
        const staffAssignment = await prisma.staffAssignment.findUnique({
          where: {
            userId_cohortId: { userId: user.userId, cohortId: existing.assignment.cohortId }
          }
        })
        if (!staffAssignment) {
          return NextResponse.json(
            { error: 'You are not assigned to this cohort' },
            { status: 403 }
          )
        }
      }

      const updateData: Record<string, unknown> = {}

      if (score !== undefined) {
        if (score < 0 || score > existing.assignment.maxPoints) {
          return NextResponse.json(
            { error: `Score must be between 0 and ${existing.assignment.maxPoints}` },
            { status: 400 }
          )
        }
        updateData.score = score
        updateData.gradedAt = new Date()
        updateData.gradedById = user.userId
        updateData.status = 'GRADED'
      }

      if (feedback !== undefined) updateData.feedback = feedback
      if (status !== undefined) updateData.status = status

      const submission = await prisma.submission.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true
            }
          },
          assignment: {
            select: {
              id: true,
              title: true,
              maxPoints: true,
              passingScore: true
            }
          }
        }
      })

      // Notify student if graded
      if (score !== undefined) {
        const passed = score >= existing.assignment.passingScore
        await prisma.notification.create({
          data: {
            userId: existing.userId,
            type: 'SUBMISSION_GRADED',
            title: passed ? 'Assignment Passed!' : 'Assignment Graded',
            message: `Your submission for "${existing.assignment.title}" has been graded: ${score}/${existing.assignment.maxPoints}`,
            link: `/student/submissions`
          }
        })
      }

      return NextResponse.json({ submission })
    }

    // Student updating their submission
    if (existing.userId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (existing.status === 'GRADED') {
      return NextResponse.json(
        { error: 'Cannot update a graded submission' },
        { status: 400 }
      )
    }

    const { content, fileUrl, fileName, githubUrl, isDraft } = body

    const now = new Date()
    let status = isDraft ? 'DRAFT' : 'SUBMITTED'

    if (!isDraft && now > new Date(existing.assignment.dueDate)) {
      if (existing.assignment.lateDeadline && now <= new Date(existing.assignment.lateDeadline)) {
        status = 'LATE'
      } else {
        status = 'LATE'
      }
    }

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        content: content !== undefined ? content : existing.content,
        fileUrl: fileUrl !== undefined ? fileUrl : existing.fileUrl,
        fileName: fileName !== undefined ? fileName : existing.fileName,
        githubUrl: githubUrl !== undefined ? githubUrl : existing.githubUrl,
        status,
        submittedAt: isDraft ? existing.submittedAt : now
      }
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error updating submission:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}

// DELETE /api/submissions/[id] - Delete submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.submission.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Only admin or owner (if draft) can delete
    if (isAdmin(user)) {
      await prisma.submission.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    if (existing.userId === user.userId && existing.status === 'DRAFT') {
      await prisma.submission.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
  }
}
