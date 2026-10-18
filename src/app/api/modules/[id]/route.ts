import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/modules/[id] - Get module details
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

    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { lessonProgress: true }
            }
          }
        },
        assignments: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            isPublished: true
          }
        },
        cohortModules: {
          include: {
            cohort: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        _count: {
          select: {
            lessons: true,
            assignments: true
          }
        }
      }
    })

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Non-admin/staff can only see published modules
    if (!isAdmin(user) && !isStaff(user) && !module.isPublished) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    return NextResponse.json({ module })
  } catch (error) {
    console.error('Error fetching module:', error)
    return NextResponse.json({ error: 'Failed to fetch module' }, { status: 500 })
  }
}

// PUT /api/modules/[id] - Update module
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
    const { title, description, week, order, isPublished } = body

    const existing = await prisma.module.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
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
        while (await prisma.module.findFirst({ where: { slug, id: { not: id } } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
        updateData.slug = slug
      }
    }

    if (description !== undefined) updateData.description = description
    if (week !== undefined) updateData.week = week
    if (order !== undefined) updateData.order = order
    if (isPublished !== undefined) updateData.isPublished = isPublished

    const module = await prisma.module.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            lessons: true,
            assignments: true
          }
        }
      }
    })

    return NextResponse.json({ module })
  } catch (error) {
    console.error('Error updating module:', error)
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 })
  }
}

// DELETE /api/modules/[id] - Delete module
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

    const existing = await prisma.module.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
            assignments: true
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Prevent deletion if there are lessons or assignments
    if (existing._count.lessons > 0 || existing._count.assignments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete module with lessons or assignments. Delete them first.' },
        { status: 400 }
      )
    }

    await prisma.module.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting module:', error)
    return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 })
  }
}
