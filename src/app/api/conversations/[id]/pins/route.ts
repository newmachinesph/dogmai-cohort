import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/conversations/[id]/pins - Get pinned messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await params

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

    const pinnedMessages = await prisma.messagePin.findMany({
      where: { conversationId },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        },
        pinnedBy: {
          select: {
            id: true,
            displayName: true,
            username: true
          }
        }
      },
      orderBy: { pinnedAt: 'desc' }
    })

    return NextResponse.json({ pinnedMessages })
  } catch (error) {
    console.error('Error fetching pinned messages:', error)
    return NextResponse.json({ error: 'Failed to fetch pinned messages' }, { status: 500 })
  }
}

// POST /api/conversations/[id]/pins - Pin a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await params
    const body = await request.json()
    const { messageId } = body

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
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

    // Verify message exists in this conversation
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

    // Check if already pinned
    const existingPin = await prisma.messagePin.findUnique({
      where: {
        messageId_conversationId: {
          messageId,
          conversationId
        }
      }
    })

    if (existingPin) {
      return NextResponse.json({ error: 'Message already pinned' }, { status: 400 })
    }

    // Pin the message
    const pin = await prisma.messagePin.create({
      data: {
        messageId,
        conversationId,
        pinnedById: user.userId
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ pin }, { status: 201 })
  } catch (error) {
    console.error('Error pinning message:', error)
    return NextResponse.json({ error: 'Failed to pin message' }, { status: 500 })
  }
}

// DELETE /api/conversations/[id]/pins - Unpin a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await params
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
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

    // Delete the pin
    await prisma.messagePin.delete({
      where: {
        messageId_conversationId: {
          messageId,
          conversationId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unpinning message:', error)
    return NextResponse.json({ error: 'Failed to unpin message' }, { status: 500 })
  }
}
