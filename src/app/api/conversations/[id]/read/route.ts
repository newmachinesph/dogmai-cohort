import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/conversations/[id]/read - Mark messages as read
export async function POST(
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
    const { messageIds } = body

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      // If no specific messageIds, mark all as read by updating lastReadAt
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId: user.userId
          }
        },
        data: { lastReadAt: new Date() }
      })

      return NextResponse.json({ success: true })
    }

    // Create read receipts for specific messages
    const receipts = await Promise.all(
      messageIds.map(async (messageId: string) => {
        // Check if message exists and belongs to this conversation
        const message = await prisma.message.findFirst({
          where: {
            id: messageId,
            conversationId: id,
            isDeleted: false
          }
        })

        if (!message) return null

        // Upsert read receipt
        return prisma.messageReadReceipt.upsert({
          where: {
            messageId_userId: {
              messageId,
              userId: user.userId
            }
          },
          create: {
            messageId,
            userId: user.userId,
            readAt: new Date()
          },
          update: {
            readAt: new Date()
          }
        })
      })
    )

    // Update lastReadAt on participant
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId
        }
      },
      data: { lastReadAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      readCount: receipts.filter(Boolean).length
    })
  } catch (error) {
    console.error('Error marking as read:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}

// GET /api/conversations/[id]/read - Get read receipts for messages
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
    const { searchParams } = new URL(request.url)
    const messageIds = searchParams.get('messageIds')?.split(',') || []

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.userId
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (messageIds.length === 0) {
      return NextResponse.json({ receipts: {} })
    }

    // Get read receipts for specified messages
    const receipts = await prisma.messageReadReceipt.findMany({
      where: {
        messageId: { in: messageIds }
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

    // Group by messageId
    const grouped = receipts.reduce((acc, receipt) => {
      if (!acc[receipt.messageId]) {
        acc[receipt.messageId] = []
      }
      acc[receipt.messageId].push({
        userId: receipt.userId,
        user: receipt.user,
        readAt: receipt.readAt.toISOString()
      })
      return acc
    }, {} as Record<string, Array<{ userId: string; user: unknown; readAt: string }>>)

    return NextResponse.json({ receipts: grouped })
  } catch (error) {
    console.error('Error fetching read receipts:', error)
    return NextResponse.json({ error: 'Failed to fetch read receipts' }, { status: 500 })
  }
}
