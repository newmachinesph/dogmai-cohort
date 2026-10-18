import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/lessons/[id] - Get lesson details
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

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            orderIndex: true,
            lessons: {
              select: {
                id: true,
                title: true,
                slug: true,
                order: true
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        lessonProgress: user.role === 'STUDENT' ? {
          where: { userId: user.userId }
        } : false
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Non-admin/staff can only see published lessons
    if (!isAdmin(user) && !isStaff(user) && !lesson.isPublished) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Parse JSON fields
    const formattedLesson = {
      ...lesson,
      prerequisiteIds: lesson.prerequisiteIds ? JSON.parse(lesson.prerequisiteIds) : [],
      resources: lesson.resources ? JSON.parse(lesson.resources) : [],
      content: lesson.content ? JSON.parse(lesson.content) : []
    }

    return NextResponse.json({ lesson: formattedLesson })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json({ error: 'Failed to fetch lesson' }, { status: 500 })
  }
}

// PUT /api/lessons/[id] - Update lesson
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      content,
      difficulty,
      estimatedTime,
      order,
      isPublished,
      prerequisiteIds,
      videoUrl,
      resources
    } = body

    const existing = await prisma.lesson.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      updateData.title = title
      // Update slug if title changed
      if (title !== existing.title) {
        const baseSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        let slug = baseSlug
        let counter = 1
        while (await prisma.lesson.findFirst({
          where: { moduleId: existing.moduleId, slug, id: { not: id } }
        })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
        updateData.slug = slug
      }
    }

    if (description !== undefined) updateData.description = description
    if (content !== undefined) updateData.content = typeof content === 'string' ? content : JSON.stringify(content)
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime
    if (order !== undefined) updateData.order = order
    if (isPublished !== undefined) updateData.isPublished = isPublished
    if (prerequisiteIds !== undefined) updateData.prerequisiteIds = JSON.stringify(prerequisiteIds)
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl
    if (resources !== undefined) updateData.resources = JSON.stringify(resources)

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData,
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Error updating lesson:', error)
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 })
  }
}

// DELETE /api/lessons/[id] - Delete lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.lesson.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    await prisma.lesson.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lesson:', error)
    return NextResponse.json({ error: 'Failed to delete lesson' }, { status: 500 })
  }
}
