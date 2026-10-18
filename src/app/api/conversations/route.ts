import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import {
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  internalErrorResponse,
  createdResponse,
} from '@/lib/api-utils'

// GET /api/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Get all conversations the user is part of
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: user.userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
                role: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: { isDeleted: false }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Build map of conversation IDs to user's lastReadAt for unread count calculation
    const conversationLastReadMap = new Map<string, Date>()
    conversations.forEach(conv => {
      const currentParticipant = conv.participants.find(p => p.userId === user.userId)
      conversationLastReadMap.set(conv.id, currentParticipant?.lastReadAt || new Date(0))
    })

    // FIX N+1: Batch query all unread messages in a single query instead of N queries
    const conversationIds = conversations.map(c => c.id)

    // Query all potential unread messages in one go
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        isDeleted: false,
        senderId: { not: user.userId }
      },
      select: {
        conversationId: true,
        createdAt: true
      }
    })

    // Build unread count map by filtering messages after lastReadAt
    const unreadCountMap = new Map<string, number>()
    conversationIds.forEach(id => unreadCountMap.set(id, 0))

    unreadMessages.forEach(msg => {
      const lastReadAt = conversationLastReadMap.get(msg.conversationId) || new Date(0)
      if (msg.createdAt > lastReadAt) {
        unreadCountMap.set(msg.conversationId, (unreadCountMap.get(msg.conversationId) || 0) + 1)
      }
    })

    // Format conversations with unread count and other user info (no async needed now)
    const formattedConversations = conversations.map((conv) => {
      // Get other participants (for display)
      const otherParticipants = conv.participants.filter(p => p.userId !== user.userId)

      return {
        id: conv.id,
        type: conv.type,
        name: conv.type === 'GROUP' ? conv.name : null,
        participants: otherParticipants.map(p => p.user),
        lastMessage: conv.messages[0] || null,
        unreadCount: unreadCountMap.get(conv.id) || 0,
        updatedAt: conv.updatedAt
      }
    })

    return successResponse({ conversations: formattedConversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return internalErrorResponse('Failed to fetch conversations')
  }
}

// POST /api/conversations - Create a new conversation or get existing one
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { participantIds, type = 'DIRECT', name } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return validationErrorResponse('At least one participant is required')
    }

    // Include current user in participants
    const allParticipantIds = [...new Set([user.userId, ...participantIds])]

    // For direct messages, check if conversation already exists
    if (type === 'DIRECT' && allParticipantIds.length === 2) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: allParticipantIds.map(id => ({
            participants: { some: { userId: id } }
          }))
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                  role: true
                }
              }
            }
          }
        }
      })

      if (existingConversation) {
        // Also verify it has exactly 2 participants
        if (existingConversation.participants.length === 2) {
          return successResponse({ conversation: existingConversation })
        }
      }
    }

    // Verify all participants exist
    const users = await prisma.user.findMany({
      where: { id: { in: allParticipantIds } }
    })

    if (users.length !== allParticipantIds.length) {
      return validationErrorResponse('One or more participants not found')
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        type,
        name: type === 'GROUP' ? name : null,
        participants: {
          create: allParticipantIds.map(userId => ({
            userId,
            lastReadAt: userId === user.userId ? new Date() : null
          }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                username: true,
                avatarUrl: true,
                role: true
              }
            }
          }
        }
      }
    })

    return createdResponse({ conversation })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return internalErrorResponse('Failed to create conversation')
  }
}
