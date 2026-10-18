import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/lessons/[id]/progress - Update lesson progress for current user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: lessonId } = await params
    const body = await request.json()
    const { status } = body

    // Check lesson exists
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Upsert progress
    const now = new Date()
    const progressStatus = status || 'IN_PROGRESS'

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: user.userId, lessonId }
      },
      update: {
        status: progressStatus,
        ...(progressStatus === 'COMPLETED' ? { completedAt: now } : {})
      },
      create: {
        userId: user.userId,
        lessonId,
        status: progressStatus,
        startedAt: progressStatus === 'IN_PROGRESS' ? now : null,
        completedAt: progressStatus === 'COMPLETED' ? now : null
      }
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error updating lesson progress:', error)
    return NextResponse.json({ error: 'Failed to update lesson progress' }, { status: 500 })
  }
}

// GET /api/lessons/[id]/progress - Get lesson progress for current user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: lessonId } = await params

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId: user.userId, lessonId }
      }
    })

    return NextResponse.json({
      progress: progress || { status: 'NOT_STARTED', startedAt: null, completedAt: null }
    })
  } catch (error) {
    console.error('Error fetching lesson progress:', error)
    return NextResponse.json({ error: 'Failed to fetch lesson progress' }, { status: 500 })
  }
}
