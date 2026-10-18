import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/submissions - List submissions
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const cohortId = searchParams.get('cohortId')
    const needsGrading = searchParams.get('needsGrading')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (assignmentId) {
      where.assignmentId = assignmentId
    }

    if (userId) {
      // Students can only see their own submissions
      if (!isAdmin(user) && !isStaff(user) && userId !== user.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      where.userId = userId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (cohortId) {
      where.assignment = { cohortId }
    }

    if (needsGrading === 'true') {
      where.status = { in: ['SUBMITTED', 'LATE'] }
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
          { displayName: { contains: search } }
        ]
      }
    }

    // Non-admin/staff can only see their own submissions
    if (!isAdmin(user) && !isStaff(user)) {
      where.userId = user.userId
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
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
            select: {
              id: true,
              title: true,
              dueDate: true,
              lateDeadline: true,
              maxPoints: true,
              passingScore: true,
              cohort: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.submission.count({ where })
    ])

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}

// POST /api/submissions - Create a new submission
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assignmentId, content, fileUrl, fileName, githubUrl, isDraft } = body

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
    }

    // Check assignment exists and is published
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (!assignment.isPublished && !isAdmin(user) && !isStaff(user)) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Check student is enrolled in the cohort
    if (!isAdmin(user) && !isStaff(user)) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId: assignment.cohortId }
        }
      })

      if (!enrollment || enrollment.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'You are not enrolled in this cohort' },
          { status: 403 }
        )
      }
    }

    // Check for existing submission
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId,
        userId: user.userId
      }
    })

    // Determine status
    const now = new Date()
    let status = isDraft ? 'DRAFT' : 'SUBMITTED'

    if (!isDraft && now > new Date(assignment.dueDate)) {
      if (assignment.lateDeadline && now <= new Date(assignment.lateDeadline)) {
        status = 'LATE'
      } else if (!assignment.lateDeadline) {
        status = 'LATE'
      } else {
        return NextResponse.json(
          { error: 'Late deadline has passed. Submission not accepted.' },
          { status: 400 }
        )
      }
    }

    let submission
    if (existingSubmission) {
      // Update existing submission (resubmission)
      if (existingSubmission.status === 'GRADED') {
        return NextResponse.json(
          { error: 'Cannot resubmit a graded assignment. Contact your instructor.' },
          { status: 400 }
        )
      }

      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          content: content || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          githubUrl: githubUrl || null,
          status,
          submittedAt: isDraft ? existingSubmission.submittedAt : now
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              cohort: { select: { name: true } }
            }
          }
        }
      })
    } else {
      // Create new submission
      submission = await prisma.submission.create({
        data: {
          assignmentId,
          userId: user.userId,
          content: content || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          githubUrl: githubUrl || null,
          status,
          submittedAt: now
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              cohort: { select: { name: true } }
            }
          }
        }
      })
    }

    // Notify staff about new submission (if not draft)
    if (!isDraft) {
      const staffAssignments = await prisma.staffAssignment.findMany({
        where: { cohortId: assignment.cohortId },
        select: { userId: true }
      })

      await prisma.notification.createMany({
        data: staffAssignments.map(s => ({
          userId: s.userId,
          type: 'SYSTEM',
          title: 'New Submission',
          message: `${user.username} submitted ${submission.assignment.title}`,
          link: `/staff/grading`
        }))
      })
    }

    return NextResponse.json({ submission }, { status: 201 })
  } catch (error) {
    console.error('Error creating submission:', error)
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }
}
