import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/modules - List all modules
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const published = searchParams.get('published')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10') || 10))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    // Non-admin/staff can only see published modules
    if (!isAdmin(user) && !isStaff(user)) {
      where.isPublished = true
    } else if (published === 'true') {
      where.isPublished = true
    } else if (published === 'false') {
      where.isPublished = false
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ]
    }

    const [modules, total] = await Promise.all([
      prisma.module.findMany({
        where,
        include: {
          _count: {
            select: {
              lessons: true,
              assignments: true
            }
          },
          lessons: {
            select: {
              id: true,
              title: true,
              slug: true,
              order: true,
              isPublished: true,
              difficulty: true,
              estimatedTime: true
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { orderIndex: 'asc' },
        skip,
        take: limit
      }),
      prisma.module.count({ where })
    ])

    return NextResponse.json({
      modules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching modules:', error)
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
  }
}

// POST /api/modules - Create a new module
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, orderIndex, isPublished } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    let slug = baseSlug
    let counter = 1
    while (await prisma.module.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Get the max orderIndex if not provided
    let moduleOrderIndex = orderIndex
    if (moduleOrderIndex === undefined) {
      const maxOrder = await prisma.module.aggregate({
        _max: { orderIndex: true }
      })
      moduleOrderIndex = (maxOrder._max.orderIndex ?? -1) + 1
    }

    const module = await prisma.module.create({
      data: {
        title,
        slug,
        description: description || null,
        orderIndex: moduleOrderIndex,
        isPublished: isPublished || false
      },
      include: {
        _count: {
          select: {
            lessons: true,
            assignments: true
          }
        }
      }
    })

    return NextResponse.json({ module }, { status: 201 })
  } catch (error) {
    console.error('Error creating module:', error)
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
  }
}
