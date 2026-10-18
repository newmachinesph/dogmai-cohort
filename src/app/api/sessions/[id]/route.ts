import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/sessions/[id] - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        cohort: { select: { id: true, name: true, slug: true } },
        module: { select: { id: true, title: true, slug: true } },
        attendance: {
          include: {
            user: {
              select: { id: true, email: true, username: true, displayName: true, avatarUrl: true }
            }
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

// PUT /api/sessions/[id] - Update session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const session = await prisma.session.findUnique({ where: { id } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Staff can only update sessions for their assigned cohorts
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: { userId_cohortId: { userId: user.userId, cohortId: session.cohortId } }
      })
      if (!assignment) {
        return NextResponse.json({ error: 'Not assigned to this cohort' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { title, description, date, startTime, endTime, mode, location, moduleId, status } = body

    const updated = await prisma.session.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(date && { date: new Date(date) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(mode && { mode }),
        ...(location !== undefined && { location }),
        ...(moduleId !== undefined && { moduleId }),
        ...(status && { status })
      },
      include: {
        cohort: { select: { id: true, name: true } },
        module: { select: { id: true, title: true } }
      }
    })

    return NextResponse.json({ session: updated })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    await prisma.session.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
