import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/assignments/[id] - Get assignment details
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

    const assignment = await prisma.assignment.findUnique({
      where: { id },
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
            title: true,
            orderIndex: true
          }
        },
        submissions: isAdmin(user) || isStaff(user) ? {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        } : {
          where: { userId: user.userId }
        },
        _count: {
          select: { submissions: true }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Non-admin/staff can only see published assignments in their enrolled cohorts
    if (!isAdmin(user) && !isStaff(user)) {
      if (!assignment.isPublished) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId: assignment.cohortId }
        }
      })

      if (!enrollment) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Parse JSON fields
    const formattedAssignment = {
      ...assignment,
      rubric: assignment.rubric ? JSON.parse(assignment.rubric) : null,
      allowedFormats: assignment.allowedFormats ? JSON.parse(assignment.allowedFormats) : null
    }

    return NextResponse.json({ assignment: formattedAssignment })
  } catch (error) {
    console.error('Error fetching assignment:', error)
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 })
  }
}

// PUT /api/assignments/[id] - Update assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      instructions,
      dueDate,
      lateDeadline,
      maxPoints,
      passingScore,
      rubric,
      submissionType,
      maxFileSize,
      allowedFormats,
      isPublished
    } = body

    const existing = await prisma.assignment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Staff can only update assignments for their assigned cohorts
    if (!isAdmin(user)) {
      const staffAssignment = await prisma.staffAssignment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId: existing.cohortId }
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

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (instructions !== undefined) updateData.instructions = instructions
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (lateDeadline !== undefined) updateData.lateDeadline = lateDeadline ? new Date(lateDeadline) : null
    if (maxPoints !== undefined) updateData.maxPoints = maxPoints
    if (passingScore !== undefined) updateData.passingScore = passingScore
    if (rubric !== undefined) updateData.rubric = rubric ? JSON.stringify(rubric) : null
    if (submissionType !== undefined) updateData.submissionType = submissionType
    if (maxFileSize !== undefined) updateData.maxFileSize = maxFileSize
    if (allowedFormats !== undefined) updateData.allowedFormats = allowedFormats ? JSON.stringify(allowedFormats) : null
    if (isPublished !== undefined) updateData.isPublished = isPublished

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
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
    })

    // If just published, notify enrolled students
    if (isPublished && !existing.isPublished) {
      const enrollments = await prisma.enrollment.findMany({
        where: { cohortId: existing.cohortId, status: 'ACTIVE' },
        select: { userId: true }
      })

      await prisma.notification.createMany({
        data: enrollments.map(e => ({
          userId: e.userId,
          type: 'ASSIGNMENT_POSTED',
          title: 'New Assignment',
          message: `New assignment posted: ${assignment.title}`,
          link: `/student/assignments`
        }))
      })
    }

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Error updating assignment:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
}

// DELETE /api/assignments/[id] - Delete assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.assignment.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Warn if there are submissions
    if (existing._count.submissions > 0) {
      const { searchParams } = new URL(request.url)
      const force = searchParams.get('force') === 'true'

      if (!force) {
        return NextResponse.json(
          {
            error: 'Assignment has submissions. Use ?force=true to delete anyway.',
            submissionCount: existing._count.submissions
          },
          { status: 400 }
        )
      }
    }

    await prisma.assignment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
  }
}
