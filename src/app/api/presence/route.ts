import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/presence - Update user's presence (heartbeat)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status = 'ONLINE' } = body

    // Upsert presence
    await prisma.userPresence.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        status,
        lastSeenAt: new Date()
      },
      update: {
        status,
        lastSeenAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 })
  }
}

// GET /api/presence - Get presence of specific users
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userIds = searchParams.get('userIds')?.split(',') || []

    if (userIds.length === 0) {
      return NextResponse.json({ presence: {} })
    }

    // Get presence records
    const presenceRecords = await prisma.userPresence.findMany({
      where: { userId: { in: userIds } }
    })

    // Consider offline if last seen > 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

    const presence: Record<string, { status: string; lastSeenAt: string }> = {}

    for (const record of presenceRecords) {
      const isOnline = record.lastSeenAt >= twoMinutesAgo
      presence[record.userId] = {
        status: isOnline ? record.status : 'OFFLINE',
        lastSeenAt: record.lastSeenAt.toISOString()
      }
    }

    // Add offline status for users without presence records
    for (const userId of userIds) {
      if (!presence[userId]) {
        presence[userId] = { status: 'OFFLINE', lastSeenAt: '' }
      }
    }

    return NextResponse.json({ presence })
  } catch (error) {
    console.error('Error fetching presence:', error)
    return NextResponse.json({ error: 'Failed to fetch presence' }, { status: 500 })
  }
}
