import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/conversations/search - Search through messages
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const conversationId = searchParams.get('conversationId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    // Get user's conversations
    const participantRecords = await prisma.conversationParticipant.findMany({
      where: { userId: user.userId },
      select: { conversationId: true }
    })

    const userConversationIds = participantRecords.map(p => p.conversationId)

    // Build search query
    const whereClause: Record<string, unknown> = {
      isDeleted: false,
      contentType: 'TEXT',
      content: { contains: query }
    }

    if (conversationId) {
      // Search in specific conversation
      if (!userConversationIds.includes(conversationId)) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
      }
      whereClause.conversationId = conversationId
    } else {
      // Search in all user's conversations
      whereClause.conversationId = { in: userConversationIds }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true
          }
        },
        conversation: {
          select: {
            id: true,
            type: true,
            name: true,
            participants: {
              where: { userId: { not: user.userId } },
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true
                  }
                }
              },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Format results to match MessageSearch component expectations
    const formattedMessages = messages.map(m => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      conversationId: m.conversation.id,
      conversationName: m.conversation.type === 'GROUP'
        ? m.conversation.name
        : m.conversation.participants[0]?.user.displayName || m.conversation.participants[0]?.user.username || null,
      sender: m.sender
    }))

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error('Error searching messages:', error)
    return NextResponse.json({ error: 'Failed to search messages' }, { status: 500 })
  }
}
