import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin } from '@/lib/auth'

// GET /api/staff-assignments - List staff assignments
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.cohortId = cohortId
    }

    if (userId) {
      where.userId = userId
    }

    if (role && role !== 'all') {
      where.role = role
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

    const [assignments, total] = await Promise.all([
      prisma.staffAssignment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true
            }
          },
          cohort: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              location: true
            }
          }
        },
        orderBy: { assignedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.staffAssignment.count({ where })
    ])

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
    console.error('Error fetching staff assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch staff assignments' }, { status: 500 })
  }
}

// POST /api/staff-assignments - Assign staff to cohort
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { cohortId, userId, role } = body

    if (!cohortId || !userId) {
      return NextResponse.json(
        { error: 'Cohort ID and User ID are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['INSTRUCTOR', 'TEACHING_ASSISTANT', 'MENTOR']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check cohort exists
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Check user exists and is staff/admin
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (targetUser.role !== 'STAFF' && targetUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'User must be a staff member or admin' },
        { status: 400 }
      )
    }

    // Check for existing assignment
    const existing = await prisma.staffAssignment.findUnique({
      where: {
        userId_cohortId: { userId, cohortId }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Staff member is already assigned to this cohort' },
        { status: 400 }
      )
    }

    const assignment = await prisma.staffAssignment.create({
      data: {
        userId,
        cohortId,
        role: role || 'INSTRUCTOR'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true
          }
        },
        cohort: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    // Notify the assigned staff member
    await prisma.notification.create({
      data: {
        userId,
        type: 'COHORT_UPDATE',
        title: 'New Cohort Assignment',
        message: `You have been assigned to ${cohort.name} as ${role || 'INSTRUCTOR'}`,
        link: `/staff/cohorts`
      }
    })

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Error creating staff assignment:', error)
    return NextResponse.json({ error: 'Failed to create staff assignment' }, { status: 500 })
  }
}
