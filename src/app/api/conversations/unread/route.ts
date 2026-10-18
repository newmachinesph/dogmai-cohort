import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/conversations/unread - Get total unread message count
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all conversations the user is part of
    const participants = await prisma.conversationParticipant.findMany({
      where: { userId: user.userId },
      select: {
        conversationId: true,
        lastReadAt: true
      }
    })

    // Count unread messages across all conversations
    let totalUnread = 0

    for (const participant of participants) {
      const count = await prisma.message.count({
        where: {
          conversationId: participant.conversationId,
          isDeleted: false,
          createdAt: {
            gt: participant.lastReadAt || new Date(0)
          },
          senderId: { not: user.userId }
        }
      })
      totalUnread += count
    }

    return NextResponse.json({ unreadCount: totalUnread })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
  }
}
