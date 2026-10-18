import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/sessions - List sessions
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.cohortId = cohortId
    }

    if (startDate) {
      where.date = { ...((where.date as object) || {}), gte: new Date(startDate) }
    }

    if (endDate) {
      where.date = { ...((where.date as object) || {}), lte: new Date(endDate) }
    }

    if (status) {
      where.status = status
    }

    // Students can only see sessions for their enrolled cohorts
    if (!isAdmin(user) && !isStaff(user)) {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId, status: 'ACTIVE' },
        select: { cohortId: true }
      })
      const cohortIds = enrollments.map(e => e.cohortId)

      if (cohortId && !cohortIds.includes(cohortId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      if (!cohortId) {
        where.cohortId = { in: cohortIds }
      }
    }

    // Staff can only see sessions for their assigned cohorts
    if (isStaff(user) && !isAdmin(user)) {
      const assignments = await prisma.staffAssignment.findMany({
        where: { userId: user.userId },
        select: { cohortId: true }
      })
      const cohortIds = assignments.map(a => a.cohortId)

      if (cohortId && !cohortIds.includes(cohortId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      if (!cohortId) {
        where.cohortId = { in: cohortIds }
      }
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        cohort: {
          select: { id: true, name: true, slug: true }
        },
        module: {
          select: { id: true, title: true, slug: true }
        },
        _count: {
          select: { attendance: true }
        }
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST /api/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { cohortId, title, description, date, startTime, endTime, mode, location, moduleId, status } = body

    if (!cohortId || !title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Cohort ID, title, date, start time, and end time are required' },
        { status: 400 }
      )
    }

    // Check cohort exists
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Staff can only create sessions for their assigned cohorts
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: { userId_cohortId: { userId: user.userId, cohortId } }
      })
      if (!assignment) {
        return NextResponse.json({ error: 'Not assigned to this cohort' }, { status: 403 })
      }
    }

    const session = await prisma.session.create({
      data: {
        cohortId,
        title,
        description: description || null,
        date: new Date(date),
        startTime,
        endTime,
        mode: mode || 'HYBRID',
        location: location || null,
        moduleId: moduleId || null,
        status: status || 'SCHEDULED'
      },
      include: {
        cohort: { select: { id: true, name: true } },
        module: { select: { id: true, title: true } }
      }
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
