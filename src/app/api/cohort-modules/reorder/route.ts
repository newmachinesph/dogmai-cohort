import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'
import { z } from 'zod'

const reorderSchema = z.object({
  cohortId: z.string().min(1, 'Cohort ID is required'),
  moduleIds: z.array(z.string()).min(1, 'At least one module ID is required'),
})

// PUT /api/cohort-modules/reorder - Reorder modules in a cohort
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validation = reorderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { cohortId, moduleIds } = validation.data

    // Verify cohort exists
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId }
    })

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 })
    }

    // Verify all cohort modules exist and belong to this cohort
    const existingModules = await prisma.cohortModule.findMany({
      where: {
        cohortId,
        id: { in: moduleIds }
      }
    })

    if (existingModules.length !== moduleIds.length) {
      return NextResponse.json(
        { error: 'Some cohort modules not found or do not belong to this cohort' },
        { status: 400 }
      )
    }

    // Update order indexes in a transaction
    await prisma.$transaction(
      moduleIds.map((id, index) =>
        prisma.cohortModule.update({
          where: { id },
          data: { orderIndex: index }
        })
      )
    )

    // Fetch updated modules
    const updatedModules = await prisma.cohortModule.findMany({
      where: { cohortId },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            isPublished: true,
            _count: {
              select: { lessons: true }
            }
          }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })

    return NextResponse.json({
      success: true,
      cohortModules: updatedModules
    })
  } catch (error) {
    console.error('Error reordering cohort modules:', error)
    return NextResponse.json({ error: 'Failed to reorder cohort modules' }, { status: 500 })
  }
}
