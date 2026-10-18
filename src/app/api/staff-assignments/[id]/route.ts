import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin } from '@/lib/auth'

// PUT /api/staff-assignments/[id] - Update staff role
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
    const { role } = body

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 })
    }

    const validRoles = ['INSTRUCTOR', 'TEACHING_ASSISTANT', 'MENTOR']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await prisma.staffAssignment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const assignment = await prisma.staffAssignment.update({
      where: { id },
      data: { role },
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

    return NextResponse.json({ assignment })
  } catch (error) {
    console.error('Error updating staff assignment:', error)
    return NextResponse.json({ error: 'Failed to update staff assignment' }, { status: 500 })
  }
}

// DELETE /api/staff-assignments/[id] - Remove staff from cohort
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

    const existing = await prisma.staffAssignment.findUnique({
      where: { id },
      include: { cohort: true, user: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    await prisma.staffAssignment.delete({ where: { id } })

    // Notify the staff member
    await prisma.notification.create({
      data: {
        userId: existing.userId,
        type: 'COHORT_UPDATE',
        title: 'Cohort Assignment Removed',
        message: `You have been removed from ${existing.cohort.name}`,
        link: `/staff/cohorts`
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff assignment:', error)
    return NextResponse.json({ error: 'Failed to delete staff assignment' }, { status: 500 })
  }
}
