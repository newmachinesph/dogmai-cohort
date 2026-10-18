import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/conversations/[id]/messages - Get messages with polling support
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
    const after = searchParams.get('after') // For polling - get messages after this timestamp
    const before = searchParams.get('before') // For pagination - get older messages
    const limit = parseInt(searchParams.get('limit') || '50')

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

    // Build query
    const whereClause: Record<string, unknown> = {
      conversationId: id,
      isDeleted: false
    }

    if (after) {
      whereClause.createdAt = { gt: new Date(after) }
    } else if (before) {
      whereClause.createdAt = { lt: new Date(before) }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                username: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: after ? 'asc' : 'desc' },
      take: limit
    })

    // If polling (after param), update last read time
    if (after && messages.length > 0) {
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId: user.userId
          }
        },
        data: { lastReadAt: new Date() }
      })
    }

    return NextResponse.json({
      messages: after ? messages : messages.reverse(),
      hasMore: messages.length === limit
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/conversations/[id]/messages - Send a message
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
    const { content, replyToId, fileUrl, fileName, fileSize, fileMimeType } = body

    // Determine content type
    let contentType = 'TEXT'
    if (fileUrl) {
      if (fileMimeType?.startsWith('image/')) {
        contentType = 'IMAGE'
      } else if (fileMimeType?.startsWith('video/')) {
        contentType = 'VIDEO'
      } else if (fileMimeType?.startsWith('audio/')) {
        contentType = 'AUDIO'
      } else {
        contentType = 'FILE'
      }
    }

    // Validate: must have either content or file
    const hasContent = content && typeof content === 'string' && content.trim().length > 0
    const hasFile = fileUrl && fileName

    if (!hasContent && !hasFile) {
      return NextResponse.json({ error: 'Message content or file is required' }, { status: 400 })
    }

    if (hasContent && content.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 })
    }

    // Validate replyToId if provided
    if (replyToId) {
      const replyMessage = await prisma.message.findFirst({
        where: { id: replyToId, conversationId: id, isDeleted: false }
      })
      if (!replyMessage) {
        return NextResponse.json({ error: 'Reply message not found' }, { status: 400 })
      }
    }

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

    // Create message and update conversation timestamp
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: id,
          senderId: user.userId,
          content: hasContent ? content.trim() : '',
          contentType,
          replyToId: replyToId || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileSize: fileSize || null,
          fileMimeType: fileMimeType || null
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true
            }
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  displayName: true,
                  username: true
                }
              }
            }
          }
        }
      }),
      prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
      }),
      prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId: user.userId
          }
        },
        data: { lastReadAt: new Date() }
      })
    ])

    // Create notifications for other participants
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: id,
        userId: { not: user.userId }
      },
      include: {
        user: { select: { id: true } }
      }
    })

    // Get sender info for notification
    const sender = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { displayName: true, username: true }
    })

    const senderName = sender?.displayName || sender?.username || 'Someone'

    // Build notification message
    let notificationMessage = ''
    if (hasFile && !hasContent) {
      const fileTypeLabel = contentType === 'IMAGE' ? 'an image' :
                           contentType === 'VIDEO' ? 'a video' :
                           contentType === 'AUDIO' ? 'an audio file' : 'a file'
      notificationMessage = `${senderName} sent ${fileTypeLabel}`
    } else if (hasContent) {
      notificationMessage = `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`
    }

    // Create notifications for unread users
    await prisma.notification.createMany({
      data: otherParticipants.map(p => ({
        userId: p.userId,
        type: 'MESSAGE',
        title: 'New Message',
        message: notificationMessage,
        link: `/messages/${id}`
      }))
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
