import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/cohort-modules/[id] - Get a single cohort module
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

    const cohortModule = await prisma.cohortModule.findUnique({
      where: { id },
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
      }
    })

    if (!cohortModule) {
      return NextResponse.json({ error: 'Cohort module not found' }, { status: 404 })
    }

    return NextResponse.json({ cohortModule })
  } catch (error) {
    console.error('Error fetching cohort module:', error)
    return NextResponse.json({ error: 'Failed to fetch cohort module' }, { status: 500 })
  }
}

// PUT /api/cohort-modules/[id] - Update cohort module
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
    const { startDate, endDate, unlockedAt, isLocked, orderIndex } = body

    const existingCohortModule = await prisma.cohortModule.findUnique({
      where: { id }
    })

    if (!existingCohortModule) {
      return NextResponse.json({ error: 'Cohort module not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (startDate !== undefined) {
      updateData.startDate = startDate ? new Date(startDate) : null
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null
    }
    if (unlockedAt !== undefined) {
      updateData.unlockedAt = unlockedAt ? new Date(unlockedAt) : null
    }
    if (isLocked !== undefined) {
      updateData.isLocked = isLocked
    }
    if (orderIndex !== undefined) {
      updateData.orderIndex = orderIndex
    }

    const cohortModule = await prisma.cohortModule.update({
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
            title: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json({ cohortModule })
  } catch (error) {
    console.error('Error updating cohort module:', error)
    return NextResponse.json({ error: 'Failed to update cohort module' }, { status: 500 })
  }
}

// DELETE /api/cohort-modules/[id] - Remove module from cohort
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { id } = await params

    const existingCohortModule = await prisma.cohortModule.findUnique({
      where: { id }
    })

    if (!existingCohortModule) {
      return NextResponse.json({ error: 'Cohort module not found' }, { status: 404 })
    }

    await prisma.cohortModule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cohort module:', error)
    return NextResponse.json({ error: 'Failed to delete cohort module' }, { status: 500 })
  }
}
