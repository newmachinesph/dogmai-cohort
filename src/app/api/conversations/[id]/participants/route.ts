import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/conversations/[id]/participants - Get participants
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
    const userParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!userParticipant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
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
    })

    return NextResponse.json({
      participants: participants.map(p => ({
        ...p.user,
        role: p.role,
        joinedAt: p.joinedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching participants:', error)
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
  }
}

// POST /api/conversations/[id]/participants - Add participant (group chats only)
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
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify conversation is a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation || conversation.type === 'DIRECT') {
      return NextResponse.json({ error: 'Cannot add to direct conversation' }, { status: 400 })
    }

    // Verify requester is an admin of the group
    const requesterParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!requesterParticipant || requesterParticipant.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can add participants' }, { status: 403 })
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Add participant
    const participant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
        role: 'MEMBER'
      },
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
    })

    // Create system message
    await prisma.message.create({
      data: {
        conversationId,
        senderId: user.userId,
        content: `${targetUser.displayName || targetUser.username} was added to the group`,
        contentType: 'SYSTEM'
      }
    })

    return NextResponse.json({ participant }, { status: 201 })
  } catch (error) {
    console.error('Error adding participant:', error)
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 })
  }
}

// PATCH /api/conversations/[id]/participants - Update group name or participant role
export async function PATCH(
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
    const { name, userId, role } = body

    // Verify conversation exists and is a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation || conversation.type === 'DIRECT') {
      return NextResponse.json({ error: 'Cannot update direct conversation' }, { status: 400 })
    }

    // Verify requester is an admin
    const requesterParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    if (!requesterParticipant || requesterParticipant.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update group settings' }, { status: 403 })
    }

    // Update group name
    if (name !== undefined) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { name: name || null }
      })

      // Create system message
      await prisma.message.create({
        data: {
          conversationId,
          senderId: user.userId,
          content: name ? `Group renamed to "${name}"` : 'Group name was removed',
          contentType: 'SYSTEM'
        }
      })
    }

    // Update participant role
    if (userId && role) {
      if (!['ADMIN', 'MEMBER'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }

      const targetParticipant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        },
        include: {
          user: { select: { displayName: true, username: true } }
        }
      })

      if (!targetParticipant) {
        return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
      }

      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        },
        data: { role }
      })

      // Create system message
      const targetName = targetParticipant.user.displayName || targetParticipant.user.username
      await prisma.message.create({
        data: {
          conversationId,
          senderId: user.userId,
          content: role === 'ADMIN'
            ? `${targetName} is now a group admin`
            : `${targetName} is no longer a group admin`,
          contentType: 'SYSTEM'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

// DELETE /api/conversations/[id]/participants - Remove participant
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
    const body = await request.json()
    const targetUserId = body.userId

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify conversation is a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation || conversation.type === 'DIRECT') {
      return NextResponse.json({ error: 'Cannot remove from direct conversation' }, { status: 400 })
    }

    // Verify requester is an admin or is removing themselves
    const requesterParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      }
    })

    const isRemovingSelf = targetUserId === user.userId
    const isAdmin = requesterParticipant?.role === 'ADMIN'

    if (!isRemovingSelf && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can remove others' }, { status: 403 })
    }

    // Get target user info
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { displayName: true, username: true }
    })

    // Remove participant
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId
        }
      }
    })

    // Create system message
    const message = isRemovingSelf
      ? `${targetUser?.displayName || targetUser?.username} left the group`
      : `${targetUser?.displayName || targetUser?.username} was removed from the group`

    await prisma.message.create({
      data: {
        conversationId,
        senderId: user.userId,
        content: message,
        contentType: 'SYSTEM'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing participant:', error)
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 })
  }
}
