import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/files - List cohort files
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const category = searchParams.get('category')

    if (!cohortId) {
      return NextResponse.json({ error: 'Cohort ID is required' }, { status: 400 })
    }

    // Check access to cohort
    if (!isAdmin(user)) {
      if (isStaff(user)) {
        const assignment = await prisma.staffAssignment.findUnique({
          where: { userId_cohortId: { userId: user.userId, cohortId } }
        })
        if (!assignment) {
          return NextResponse.json({ error: 'Not assigned to this cohort' }, { status: 403 })
        }
      } else {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_cohortId: { userId: user.userId, cohortId } }
        })
        if (!enrollment) {
          return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 })
        }
      }
    }

    const where: Record<string, unknown> = { cohortId }

    if (category && category !== 'all') {
      where.category = category
    }

    const files = await prisma.cohortFile.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, displayName: true, username: true, avatarUrl: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

// POST /api/files - Create file record after upload
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cohortId, name, fileName, fileUrl, fileSize, fileType, category, description } = body

    if (!cohortId || !name || !fileName || !fileUrl || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Cohort ID, name, fileName, fileUrl, fileSize, and fileType are required' },
        { status: 400 }
      )
    }

    // Check access to cohort
    if (!isAdmin(user)) {
      if (isStaff(user)) {
        const assignment = await prisma.staffAssignment.findUnique({
          where: { userId_cohortId: { userId: user.userId, cohortId } }
        })
        if (!assignment) {
          return NextResponse.json({ error: 'Not assigned to this cohort' }, { status: 403 })
        }
      } else {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_cohortId: { userId: user.userId, cohortId } }
        })
        if (!enrollment) {
          return NextResponse.json({ error: 'Not enrolled in this cohort' }, { status: 403 })
        }
      }
    }

    const file = await prisma.cohortFile.create({
      data: {
        cohortId,
        uploadedById: user.userId,
        name,
        fileName,
        fileUrl,
        fileSize,
        fileType,
        category: category || 'GENERAL',
        description: description || null
      },
      include: {
        uploadedBy: {
          select: { id: true, displayName: true, username: true, role: true }
        }
      }
    })

    return NextResponse.json({ file }, { status: 201 })
  } catch (error) {
    console.error('Error creating file:', error)
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }
}
