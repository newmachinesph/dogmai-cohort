import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/enrollments - List enrollments
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.cohortId = cohortId
    }

    if (userId) {
      // Only admins can query other users
      if (!isAdmin(user) && userId !== user.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      where.userId = userId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    // Search by user email, username, or displayName
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
          { displayName: { contains: search } }
        ]
      }
    }

    // Non-admin/staff users can only see their own enrollments
    if (!isAdmin(user) && !isStaff(user)) {
      where.userId = user.userId
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
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
          cohort: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              location: true,
              startDate: true,
              endDate: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.enrollment.count({ where })
    ])

    return NextResponse.json({
      enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
  }
}

// POST /api/enrollments - Enroll student(s) in a cohort
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { cohortId, userId, userIds, status } = body

    if (!cohortId) {
      return NextResponse.json({ error: 'Cohort ID is required' }, { status: 400 })
    }

    // Check cohort exists and has capacity
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        _count: { select: { enrollments: true } }
      }
    })

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Handle bulk enrollment
    const targetUserIds = userIds || (userId ? [userId] : [])
    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one user ID is required' },
        { status: 400 }
      )
    }

    // Check capacity
    const remainingCapacity = cohort.maxStudents - cohort._count.enrollments
    if (targetUserIds.length > remainingCapacity) {
      return NextResponse.json(
        { error: `Only ${remainingCapacity} spots remaining in this cohort` },
        { status: 400 }
      )
    }

    // Use transaction to prevent race condition on capacity check
    const result = await prisma.$transaction(async (tx) => {
      // Re-check capacity within transaction
      const currentCohort = await tx.cohort.findUnique({
        where: { id: cohortId },
        include: {
          _count: { select: { enrollments: true } }
        }
      })

      if (!currentCohort) {
        throw new Error('Cohort not found')
      }

      const remainingCapacity = currentCohort.maxStudents - currentCohort._count.enrollments
      if (targetUserIds.length > remainingCapacity) {
        throw new Error(`Only ${remainingCapacity} spots remaining in this cohort`)
      }

      // Check all users exist and are students
      const users = await tx.user.findMany({
        where: {
          id: { in: targetUserIds },
          role: 'STUDENT',
          isActive: true
        }
      })

      if (users.length !== targetUserIds.length) {
        throw new Error('Some users not found or are not active students')
      }

      // Check for existing enrollments
      const existingEnrollments = await tx.enrollment.findMany({
        where: {
          cohortId,
          userId: { in: targetUserIds }
        }
      })

      if (existingEnrollments.length > 0) {
        const existingUserIds = existingEnrollments.map(e => e.userId)
        throw new Error(`Some users are already enrolled: ${existingUserIds.join(', ')}`)
      }

      // Create enrollments
      const enrollments = await tx.enrollment.createMany({
        data: targetUserIds.map((uid: string) => ({
          userId: uid,
          cohortId,
          status: status || 'ACTIVE'
        }))
      })

      // Create notifications for enrolled students
      await tx.notification.createMany({
        data: targetUserIds.map((uid: string) => ({
          userId: uid,
          type: 'COHORT_UPDATE',
          title: 'Enrollment Confirmed',
          message: `You have been enrolled in ${cohort.name}`,
          link: `/student`
        }))
      })

      return enrollments
    })

    return NextResponse.json({
      success: true,
      count: result.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating enrollment:', error)
    // Return meaningful error from transaction
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
  }
}
