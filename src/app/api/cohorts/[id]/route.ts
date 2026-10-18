import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/cohorts/[id] - Get single cohort with details
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

    const cohort = await prisma.cohort.findUnique({
      where: { id },
      include: {
        enrollments: {
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
          }
        },
        staffAssignments: {
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
            }
          }
        },
        _count: {
          select: {
            enrollments: true,
            staffAssignments: true,
            assignments: true,
            announcements: true,
            sessions: true
          }
        }
      }
    })

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Check access for non-admin users
    if (!isAdmin(user)) {
      if (isStaff(user)) {
        const hasAccess = cohort.staffAssignments.some(a => a.userId === user.userId)
        if (!hasAccess) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      } else {
        const hasAccess = cohort.enrollments.some(e => e.userId === user.userId)
        if (!hasAccess) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    return NextResponse.json({ cohort })
  } catch (error) {
    console.error('Error fetching cohort:', error)
    return NextResponse.json({ error: 'Failed to fetch cohort' }, { status: 500 })
  }
}

// PUT /api/cohorts/[id] - Update cohort
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, location, startDate, endDate, maxStudents, schedule, status, isArchived } = body

    // Check cohort exists
    const existing = await prisma.cohort.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      updateData.name = name
      // Update slug if name changed
      if (name !== existing.name) {
        const baseSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        let slug = baseSlug
        let counter = 1
        while (await prisma.cohort.findFirst({ where: { slug, id: { not: id } } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
        updateData.slug = slug
      }
    }

    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = new Date(endDate)
    if (maxStudents !== undefined) updateData.maxStudents = maxStudents
    if (schedule !== undefined) updateData.mode = schedule.mode || 'HYBRID'
    if (status !== undefined) updateData.status = status
    if (isArchived !== undefined) updateData.isArchived = isArchived

    const cohort = await prisma.cohort.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            enrollments: true,
            staffAssignments: true
          }
        }
      }
    })

    return NextResponse.json({ cohort })
  } catch (error) {
    console.error('Error updating cohort:', error)
    return NextResponse.json({ error: 'Failed to update cohort' }, { status: 500 })
  }
}

// DELETE /api/cohorts/[id] - Delete cohort
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

    // Check cohort exists
    const existing = await prisma.cohort.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            assignments: true
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Prevent deletion if there are active enrollments with assignments
    if (existing._count.enrollments > 0 && existing._count.assignments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete cohort with students and assignments. Archive it instead.' },
        { status: 400 }
      )
    }

    await prisma.cohort.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cohort:', error)
    return NextResponse.json({ error: 'Failed to delete cohort' }, { status: 500 })
  }
}
