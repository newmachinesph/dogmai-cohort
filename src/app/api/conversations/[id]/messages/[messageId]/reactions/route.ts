import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/conversations/[id]/messages/[messageId]/reactions - Add reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params
    const body = await request.json()
    const { emoji } = body

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Verify message exists
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
        isDeleted: false
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Add or toggle reaction
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.userId,
          emoji
        }
      }
    })

    if (existingReaction) {
      // Remove reaction
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id }
      })
      return NextResponse.json({ removed: true })
    }

    // Add reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId: user.userId,
        emoji
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json({ reaction }, { status: 201 })
  } catch (error) {
    console.error('Error managing reaction:', error)
    return NextResponse.json({ error: 'Failed to manage reaction' }, { status: 500 })
  }
}

// GET /api/conversations/[id]/messages/[messageId]/reactions - Get reactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    })

    // Group by emoji
    const grouped = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, count: 0, users: [], hasReacted: false }
      }
      acc[r.emoji].count++
      acc[r.emoji].users.push(r.user)
      if (r.userId === user.userId) {
        acc[r.emoji].hasReacted = true
      }
      return acc
    }, {} as Record<string, { emoji: string; count: number; users: typeof reactions[0]['user'][]; hasReacted: boolean }>)

    return NextResponse.json({ reactions: Object.values(grouped) })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
  }
}
