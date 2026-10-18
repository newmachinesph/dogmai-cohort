import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/assignments - List assignments
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const moduleId = searchParams.get('moduleId')
    const published = searchParams.get('published')
    const upcoming = searchParams.get('upcoming')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.cohortId = cohortId
    }

    if (moduleId) {
      where.moduleId = moduleId
    }

    // Non-admin/staff can only see published assignments
    if (!isAdmin(user) && !isStaff(user)) {
      where.isPublished = true

      // Students only see assignments for their enrolled cohorts
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId, status: 'ACTIVE' },
        select: { cohortId: true }
      })
      where.cohortId = { in: enrollments.map(e => e.cohortId) }
    } else if (published === 'true') {
      where.isPublished = true
    } else if (published === 'false') {
      where.isPublished = false
    }

    if (upcoming === 'true') {
      where.dueDate = { gte: new Date() }
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ]
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
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
              slug: true
            }
          },
          _count: {
            select: { submissions: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit
      }),
      prisma.assignment.count({ where })
    ])

    // If student, include their submission status
    if (!isAdmin(user) && !isStaff(user)) {
      const submissions = await prisma.submission.findMany({
        where: {
          userId: user.userId,
          assignmentId: { in: assignments.map(a => a.id) }
        },
        select: {
          assignmentId: true,
          status: true,
          score: true,
          submittedAt: true
        }
      })

      const submissionMap = new Map(submissions.map(s => [s.assignmentId, s]))

      const assignmentsWithSubmissions = assignments.map(assignment => ({
        ...assignment,
        submission: submissionMap.get(assignment.id) || null
      }))

      return NextResponse.json({
        assignments: assignmentsWithSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }

    return NextResponse.json({
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
  }
}

// POST /api/assignments - Create a new assignment
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      cohortId,
      moduleId,
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

    if (!cohortId || !title || !description || !instructions || !dueDate) {
      return NextResponse.json(
        { error: 'Cohort ID, title, description, instructions, and due date are required' },
        { status: 400 }
      )
    }

    // Validate maxPoints
    const validMaxPoints = maxPoints || 100
    if (validMaxPoints <= 0) {
      return NextResponse.json(
        { error: 'Max points must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate passingScore
    const validPassingScore = passingScore || 60
    if (validPassingScore < 0) {
      return NextResponse.json(
        { error: 'Passing score must be 0 or greater' },
        { status: 400 }
      )
    }
    if (validPassingScore > validMaxPoints) {
      return NextResponse.json(
        { error: 'Passing score cannot exceed max points' },
        { status: 400 }
      )
    }

    // Validate due date is in the future (for new assignments)
    const dueDateObj = new Date(dueDate)
    if (dueDateObj <= new Date()) {
      return NextResponse.json(
        { error: 'Due date must be in the future' },
        { status: 400 }
      )
    }

    // Validate late deadline if provided
    if (lateDeadline) {
      const lateDeadlineObj = new Date(lateDeadline)
      if (lateDeadlineObj <= dueDateObj) {
        return NextResponse.json(
          { error: 'Late deadline must be after the due date' },
          { status: 400 }
        )
      }
    }

    // Check cohort exists
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Staff can only create assignments for their assigned cohorts
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId }
        }
      })
      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this cohort' },
          { status: 403 }
        )
      }
    }

    // Check module exists if provided
    if (moduleId) {
      const module = await prisma.module.findUnique({ where: { id: moduleId } })
      if (!module) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 })
      }
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        cohortId,
        moduleId: moduleId || null,
        title,
        description,
        instructions,
        dueDate: dueDateObj,
        lateDeadline: lateDeadline ? new Date(lateDeadline) : null,
        maxPoints: validMaxPoints,
        passingScore: validPassingScore,
        rubric: rubric ? JSON.stringify(rubric) : null,
        submissionType: submissionType || 'FILE',
        maxFileSize: maxFileSize || 10,
        allowedFormats: allowedFormats ? JSON.stringify(allowedFormats) : null,
        isPublished: isPublished || false
      },
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

    // If published, notify enrolled students
    if (isPublished) {
      const enrollments = await prisma.enrollment.findMany({
        where: { cohortId, status: 'ACTIVE' },
        select: { userId: true }
      })

      await prisma.notification.createMany({
        data: enrollments.map(e => ({
          userId: e.userId,
          type: 'ASSIGNMENT_POSTED',
          title: 'New Assignment',
          message: `New assignment posted: ${title}`,
          link: `/student/assignments`
        }))
      })
    }

    return NextResponse.json({ assignment: newAssignment }, { status: 201 })
  } catch (error) {
    console.error('Error creating assignment:', error)
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
  }
}
