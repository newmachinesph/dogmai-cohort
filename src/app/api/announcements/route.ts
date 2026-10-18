import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/announcements - List announcements
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const priority = searchParams.get('priority')
    const pinned = searchParams.get('pinned')
    const archived = searchParams.get('archived')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.cohortId = cohortId
    }

    if (priority && priority !== 'all') {
      where.priority = priority
    }

    if (pinned === 'true') {
      where.isPinned = true
    }

    // Filter archived - by default hide archived unless explicitly requested
    if (archived === 'true') {
      where.isArchived = true
    } else if (archived !== 'all') {
      where.isArchived = false
    }

    // Non-admin/staff can only see published announcements for their enrolled cohorts
    if (!isAdmin(user) && !isStaff(user)) {
      where.publishedAt = { not: null, lte: new Date() }
      where.isArchived = false // Students never see archived

      // Filter to enrolled cohorts
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId, status: 'ACTIVE' },
        select: { cohortId: true }
      })

      if (cohortId) {
        // Verify enrollment
        if (!enrollments.some(e => e.cohortId === cohortId)) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      } else {
        where.cohortId = { in: enrollments.map(e => e.cohortId) }
      }

      // Filter expired announcements
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    }

    // Staff can see their assigned cohorts
    if (isStaff(user) && !isAdmin(user)) {
      const assignments = await prisma.staffAssignment.findMany({
        where: { userId: user.userId },
        select: { cohortId: true }
      })

      if (!cohortId) {
        where.cohortId = { in: assignments.map(a => a.cohortId) }
      } else if (!assignments.some(a => a.cohortId === cohortId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ]
    }

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true
            }
          },
          readBy: {
            where: { userId: user.userId },
            select: { readAt: true }
          },
          _count: {
            select: { readBy: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { publishedAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.announcement.count({ where })
    ])

    // Transform to include isRead flag
    const announcementsWithReadStatus = announcements.map(a => ({
      ...a,
      isRead: a.readBy.length > 0,
      readAt: a.readBy[0]?.readAt || null,
      readCount: a._count.readBy,
      readBy: undefined,
      _count: undefined
    }))

    return NextResponse.json({
      announcements: announcementsWithReadStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST /api/announcements - Create a new announcement
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()
    const { cohortId, title, content, priority, isPinned, publishedAt, expiresAt } = body

    if (!cohortId || !title || !content) {
      return NextResponse.json(
        { error: 'Cohort ID, title, and content are required' },
        { status: 400 }
      )
    }

    // Check cohort exists
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Staff can only post to their assigned cohorts
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId }
        }
      })
      if (!assignment) {
        return NextResponse.json(
          { error: 'You are not assigned to this cohort' },
          { status: 403 }
        )
      }
    }

    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      )
    }

    const announcement = await prisma.announcement.create({
      data: {
        cohortId,
        createdById: user.userId,
        title,
        content,
        priority: priority || 'NORMAL',
        isPinned: isPinned || false,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        cohort: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            username: true
          }
        }
      }
    })

    // Notify enrolled students if published now
    if (!publishedAt || new Date(publishedAt) <= new Date()) {
      const enrollments = await prisma.enrollment.findMany({
        where: { cohortId, status: 'ACTIVE' },
        select: { userId: true }
      })

      await prisma.notification.createMany({
        data: enrollments.map(e => ({
          userId: e.userId,
          type: 'ANNOUNCEMENT',
          title: priority === 'URGENT' ? '🚨 Urgent Announcement' : 'New Announcement',
          message: title,
          link: `/student/announcements`
        }))
      })
    }

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}
