import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/attendance - List attendance records
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const cohortId = searchParams.get('cohortId')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}

    if (sessionId) {
      where.sessionId = sessionId
    }

    if (userId) {
      where.userId = userId
    }

    // Filter by cohort through session
    if (cohortId) {
      where.session = { cohortId }
    }

    // Students can only see their own attendance
    if (!isAdmin(user) && !isStaff(user)) {
      where.userId = user.userId
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, username: true, displayName: true, avatarUrl: true }
        },
        session: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            cohort: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { session: { date: 'desc' } }
    })

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

// POST /api/attendance - Record attendance for a session
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, records } = body

    if (!sessionId || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Session ID and records array are required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, cohortId: true }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Staff can only record attendance for their assigned cohorts
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: { userId_cohortId: { userId: user.userId, cohortId: session.cohortId } }
      })
      if (!assignment) {
        return NextResponse.json({ error: 'Not assigned to this cohort' }, { status: 403 })
      }
    }

    // Validate statuses
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']
    for (const record of records) {
      if (!record.userId || !record.status) {
        return NextResponse.json({ error: 'Each record must have userId and status' }, { status: 400 })
      }
      if (!validStatuses.includes(record.status)) {
        return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
      }
    }

    // Upsert attendance records
    const results = await Promise.all(
      records.map(async (record: { userId: string; status: string; notes?: string; checkInAt?: string; checkOutAt?: string }) => {
        return prisma.attendance.upsert({
          where: {
            userId_sessionId: {
              userId: record.userId,
              sessionId
            }
          },
          update: {
            status: record.status,
            notes: record.notes || null,
            checkInAt: record.checkInAt ? new Date(record.checkInAt) : undefined,
            checkOutAt: record.checkOutAt ? new Date(record.checkOutAt) : undefined
          },
          create: {
            userId: record.userId,
            sessionId,
            status: record.status,
            notes: record.notes || null,
            checkInAt: record.checkInAt ? new Date(record.checkInAt) : null,
            checkOutAt: record.checkOutAt ? new Date(record.checkOutAt) : null
          }
        })
      })
    )

    return NextResponse.json({ attendance: results, count: results.length })
  } catch (error) {
    console.error('Error recording attendance:', error)
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
  }
}
