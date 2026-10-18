import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/announcements/[id] - Get announcement details
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

    const announcement = await prisma.announcement.findUnique({
      where: { id },
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
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check access
    if (!isAdmin(user) && !isStaff(user)) {
      // Check enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId: announcement.cohortId }
        }
      })

      if (!enrollment) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Check if published and not expired
      const now = new Date()
      if (!announcement.publishedAt || announcement.publishedAt > now) {
        return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
      }
      if (announcement.expiresAt && announcement.expiresAt < now) {
        return NextResponse.json({ error: 'Announcement has expired' }, { status: 404 })
      }
    }

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json({ error: 'Failed to fetch announcement' }, { status: 500 })
  }
}

// PUT /api/announcements/[id] - Update announcement
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
    const { title, content, priority, isPinned, publishedAt, expiresAt } = body

    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Staff can only update their own announcements or their cohort's
    if (!isAdmin(user)) {
      const assignment = await prisma.staffAssignment.findUnique({
        where: {
          userId_cohortId: { userId: user.userId, cohortId: existing.cohortId }
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

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (priority !== undefined) {
      const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.priority = priority
    }
    if (isPinned !== undefined) updateData.isPinned = isPinned
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

    const announcement = await prisma.announcement.update({
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
        createdBy: {
          select: {
            id: true,
            displayName: true,
            username: true
          }
        }
      }
    })

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}

// PATCH /api/announcements/[id] - Mark as read (for any authenticated user)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    const announcement = await prisma.announcement.findUnique({ where: { id } })
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    if (action === 'markRead') {
      // Upsert read record
      await prisma.announcementRead.upsert({
        where: {
          announcementId_userId: {
            announcementId: id,
            userId: user.userId
          }
        },
        update: { readAt: new Date() },
        create: {
          announcementId: id,
          userId: user.userId
        }
      })

      return NextResponse.json({ success: true, isRead: true })
    }

    if (action === 'markUnread') {
      // Delete read record
      await prisma.announcementRead.deleteMany({
        where: {
          announcementId: id,
          userId: user.userId
        }
      })

      return NextResponse.json({ success: true, isRead: false })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error patching announcement:', error)
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}

// DELETE /api/announcements/[id] - Delete announcement
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

    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Staff can only delete their own announcements
    if (!isAdmin(user) && existing.createdById !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own announcements' },
        { status: 403 }
      )
    }

    await prisma.announcement.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
