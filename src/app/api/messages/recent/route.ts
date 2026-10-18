import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/messages/recent - Get recent messages for notification polling
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const after = searchParams.get('after')

    if (!after) {
      return NextResponse.json({ messages: [] })
    }

    // Get all conversations the user is part of
    const participantRecords = await prisma.conversationParticipant.findMany({
      where: { userId: user.userId },
      select: { conversationId: true }
    })

    const conversationIds = participantRecords.map(p => p.conversationId)

    if (conversationIds.length === 0) {
      return NextResponse.json({ messages: [] })
    }

    // Get messages sent after the specified time, excluding user's own messages
    const messages = await prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: user.userId },
        isDeleted: false,
        createdAt: { gt: new Date(after) }
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 10 // Limit to prevent overwhelming with notifications
    })

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        sender: m.sender
      }))
    })
  } catch (error) {
    console.error('Error fetching recent messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
