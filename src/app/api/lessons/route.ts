import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/lessons - List lessons
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId')
    const published = searchParams.get('published')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (moduleId) {
      where.moduleId = moduleId
    }

    if (difficulty && difficulty !== 'all') {
      where.difficulty = difficulty
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ]
    }

    // Non-admin/staff can only see published lessons from their enrolled cohorts
    if (!isAdmin(user) && !isStaff(user)) {
      where.isPublished = true

      // Get student's enrolled cohort IDs
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.userId,
          status: 'ACTIVE'
        },
        select: { cohortId: true }
      })
      const cohortIds = enrollments.map(e => e.cohortId)

      // If not enrolled in any cohort, return empty
      if (cohortIds.length === 0) {
        return NextResponse.json({
          lessons: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
          message: 'You are not enrolled in any active cohorts yet.'
        })
      }

      // Get unlocked module IDs for enrolled cohorts
      const cohortModules = await prisma.cohortModule.findMany({
        where: {
          cohortId: { in: cohortIds },
          isLocked: false
        },
        select: { moduleId: true }
      })
      const moduleIds = cohortModules.map(cm => cm.moduleId)

      // Filter lessons to only those in accessible modules
      if (moduleIds.length === 0) {
        return NextResponse.json({
          lessons: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
          message: 'No modules are currently unlocked for your cohort.'
        })
      }

      where.moduleId = { in: moduleIds }
    } else if (published === 'true') {
      where.isPublished = true
    } else if (published === 'false') {
      where.isPublished = false
    }

    const [lessons, total] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          module: {
            select: {
              id: true,
              title: true,
              slug: true,
              orderIndex: true
            }
          },
          _count: {
            select: { lessonProgress: true }
          }
        },
        orderBy: [
          { module: { orderIndex: 'asc' } },
          { order: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.lesson.count({ where })
    ])

    // If student, include their progress
    if (!isAdmin(user) && !isStaff(user)) {
      const progress = await prisma.lessonProgress.findMany({
        where: {
          userId: user.userId,
          lessonId: { in: lessons.map(l => l.id) }
        }
      })

      const progressMap = new Map(progress.map(p => [p.lessonId, p]))

      const lessonsWithProgress = lessons.map(lesson => ({
        ...lesson,
        progress: progressMap.get(lesson.id) || null
      }))

      return NextResponse.json({
        lessons: lessonsWithProgress,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }

    return NextResponse.json({
      lessons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
  }
}

// POST /api/lessons - Create a new lesson
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      moduleId,
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

    if (!moduleId || !title) {
      return NextResponse.json(
        { error: 'Module ID and title are required' },
        { status: 400 }
      )
    }

    // Check module exists
    const module = await prisma.module.findUnique({ where: { id: moduleId } })
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    let slug = baseSlug
    let counter = 1
    while (await prisma.lesson.findFirst({ where: { moduleId, slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Get max order if not provided
    let lessonOrder = order
    if (lessonOrder === undefined) {
      const maxOrder = await prisma.lesson.aggregate({
        where: { moduleId },
        _max: { order: true }
      })
      lessonOrder = (maxOrder._max.order ?? -1) + 1
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        title,
        slug,
        description: description || null,
        content: content || '[]',
        difficulty: difficulty || 'BEGINNER',
        estimatedTime: estimatedTime || null,
        order: lessonOrder,
        isPublished: isPublished || false,
        prerequisiteIds: prerequisiteIds ? JSON.stringify(prerequisiteIds) : null,
        videoUrl: videoUrl || null,
        resources: resources ? JSON.stringify(resources) : null
      },
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

    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    console.error('Error creating lesson:', error)
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
  }
}
