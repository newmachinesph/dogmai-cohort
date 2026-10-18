import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/cohort-modules - List cohort modules
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const moduleId = searchParams.get('moduleId')
    const isLocked = searchParams.get('isLocked')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.cohortId = cohortId
    }

    if (moduleId) {
      where.moduleId = moduleId
    }

    if (isLocked === 'true') {
      where.isLocked = true
    } else if (isLocked === 'false') {
      where.isLocked = false
    }

    const [cohortModules, total] = await Promise.all([
      prisma.cohortModule.findMany({
        where,
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true
            }
          },
          module: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              isPublished: true,
              _count: {
                select: { lessons: true }
              }
            }
          }
        },
        orderBy: { orderIndex: 'asc' },
        skip,
        take: limit
      }),
      prisma.cohortModule.count({ where })
    ])

    return NextResponse.json({
      cohortModules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching cohort modules:', error)
    return NextResponse.json({ error: 'Failed to fetch cohort modules' }, { status: 500 })
  }
}

// POST /api/cohort-modules - Assign module(s) to cohort
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { cohortId, moduleId, moduleIds, startDate, endDate, unlockedAt, isLocked } = body

    if (!cohortId) {
      return NextResponse.json({ error: 'Cohort ID is required' }, { status: 400 })
    }

    // Check cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId }
    })

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Get current max orderIndex for this cohort
    const maxOrder = await prisma.cohortModule.aggregate({
      where: { cohortId },
      _max: { orderIndex: true }
    })
    let nextOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1

    // Handle single or bulk assignment
    const targetModuleIds = moduleIds || (moduleId ? [moduleId] : [])
    if (targetModuleIds.length === 0) {
      return NextResponse.json({ error: 'At least one module ID is required' }, { status: 400 })
    }

    // Check all modules exist
    const modules = await prisma.module.findMany({
      where: { id: { in: targetModuleIds } }
    })

    if (modules.length !== targetModuleIds.length) {
      return NextResponse.json({ error: 'Some modules not found' }, { status: 404 })
    }

    // Check for existing assignments
    const existingAssignments = await prisma.cohortModule.findMany({
      where: {
        cohortId,
        moduleId: { in: targetModuleIds }
      }
    })

    if (existingAssignments.length > 0) {
      const existingModuleIds = existingAssignments.map(e => e.moduleId)
      return NextResponse.json(
        { error: `Some modules are already assigned: ${existingModuleIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Create cohort module assignments
    const cohortModules = await prisma.cohortModule.createMany({
      data: targetModuleIds.map((mid: string, index: number) => ({
        cohortId,
        moduleId: mid,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        unlockedAt: unlockedAt ? new Date(unlockedAt) : null,
        isLocked: isLocked ?? true,
        orderIndex: nextOrderIndex + index
      }))
    })

    return NextResponse.json({
      success: true,
      count: cohortModules.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating cohort module:', error)
    return NextResponse.json({ error: 'Failed to create cohort module' }, { status: 500 })
  }
}
