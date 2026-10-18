import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// PUT /api/attendance/[id] - Update attendance record
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
    const { status, notes, checkInAt, checkOutAt } = body

    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { session: { select: { cohortId: true } } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    // Staff can only update attendance for their assigned cohorts
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId: existing.session.cohortId }
        }
      })
      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this cohort' },
          { status: 403 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (checkInAt !== undefined) {
      updateData.checkInAt = checkInAt ? new Date(checkInAt) : null
    }

    if (checkOutAt !== undefined) {
      updateData.checkOutAt = checkOutAt ? new Date(checkOutAt) : null
    }

    const attendance = await prisma.attendance.update({
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
        session: {
          select: {
            id: true,
            title: true,
            date: true,
            cohort: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
  }
}

// DELETE /api/attendance/[id] - Delete attendance record
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

    const existing = await prisma.attendance.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    await prisma.attendance.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json({ error: 'Failed to delete attendance' }, { status: 500 })
  }
}
