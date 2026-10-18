import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/cohorts - List all cohorts (with filters)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const location = searchParams.get('location')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (location && location !== 'all') {
      where.location = location
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } }
      ]
    }

    // Non-admin users only see their assigned/enrolled cohorts
    let noAssignments = false
    if (!isAdmin(user)) {
      if (isStaff(user)) {
        const assignments = await prisma.staffAssignment.findMany({
          where: { userId: user.userId },
          select: { cohortId: true }
        })
        const cohortIds = assignments.map(a => a.cohortId)
        where.id = { in: cohortIds }
        noAssignments = cohortIds.length === 0
      } else {
        const enrollments = await prisma.enrollment.findMany({
          where: { userId: user.userId },
          select: { cohortId: true }
        })
        where.id = { in: enrollments.map(e => e.cohortId) }
      }
    }

    const [cohorts, total] = await Promise.all([
      prisma.cohort.findMany({
        where,
        include: {
          _count: {
            select: {
              enrollments: true,
              staffAssignments: true,
              assignments: true,
              sessions: true
            }
          }
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.cohort.count({ where })
    ])

    return NextResponse.json({
      cohorts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      ...(noAssignments && { message: 'No cohorts assigned. Contact admin to be assigned to a cohort.' })
    })
  } catch (error) {
    console.error('Error fetching cohorts:', error)
    return NextResponse.json({ error: 'Failed to fetch cohorts' }, { status: 500 })
  }
}

// POST /api/cohorts - Create a new cohort
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, location, startDate, endDate, maxStudents, mode, status } = body

    // Validate required fields
    if (!name || !location || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, location, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Use transaction to prevent race condition on slug uniqueness
    const cohort = await prisma.$transaction(async (tx) => {
      // Check for existing slug and make unique if needed
      let slug = baseSlug
      let counter = 1
      while (await tx.cohort.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      return tx.cohort.create({
        data: {
          name,
          slug,
          description: description || null,
          location,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          maxStudents: maxStudents || 25,
          mode: mode || 'HYBRID',
          status: status || 'UPCOMING'
        },
        include: {
          _count: {
            select: {
              enrollments: true,
              staffAssignments: true
            }
          }
        }
      })
    })

    return NextResponse.json({ cohort }, { status: 201 })
  } catch (error) {
    console.error('Error creating cohort:', error)
    return NextResponse.json({ error: 'Failed to create cohort' }, { status: 500 })
  }
}
