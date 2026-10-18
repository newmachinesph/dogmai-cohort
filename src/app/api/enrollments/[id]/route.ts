import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/enrollments/[id] - Get enrollment details
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

    const enrollment = await prisma.enrollment.findUnique({
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
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    // Check access
    if (!isAdmin(user) && !isStaff(user) && enrollment.userId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({ enrollment })
  } catch (error) {
    console.error('Error fetching enrollment:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollment' }, { status: 500 })
  }
}

// PUT /api/enrollments/[id] - Update enrollment status
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
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const validStatuses = ['ACTIVE', 'COMPLETED', 'DROPPED', 'ON_HOLD']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await prisma.enrollment.findUnique({
      where: { id },
      include: { cohort: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { status }

    // Set completedAt timestamp when completing
    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.completedAt = new Date()
    }

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: updateData,
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

    // Notify student of status change
    await prisma.notification.create({
      data: {
        userId: enrollment.userId,
        type: 'COHORT_UPDATE',
        title: 'Enrollment Status Updated',
        message: `Your enrollment status for ${enrollment.cohort.name} has been updated to ${status}`,
        link: `/student`
      }
    })

    return NextResponse.json({ enrollment })
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 })
  }
}

// DELETE /api/enrollments/[id] - Remove enrollment
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

    const existing = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        cohort: true,
        user: true
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    await prisma.enrollment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    return NextResponse.json({ error: 'Failed to delete enrollment' }, { status: 500 })
  }
}
