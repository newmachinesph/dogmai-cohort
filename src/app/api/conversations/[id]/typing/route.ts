import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/conversations/[id]/typing - Update typing status
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
    const { isTyping } = body

    // Update participant's typing status
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.userId
        }
      },
      data: {
        isTyping: !!isTyping,
        typingAt: isTyping ? new Date() : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating typing status:', error)
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 })
  }
}

// GET /api/conversations/[id]/typing - Get who is typing
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

    // Get participants who are typing (within last 5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000)

    const typingUsers = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        isTyping: true,
        typingAt: { gte: fiveSecondsAgo },
        userId: { not: user.userId }
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true
          }
        }
      }
    })

    return NextResponse.json({
      typingUsers: typingUsers.map(p => p.user)
    })
  } catch (error) {
    console.error('Error fetching typing status:', error)
    return NextResponse.json({ error: 'Failed to fetch typing status' }, { status: 500 })
  }
}
