import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/users/search - Search users for messaging
// Students can only search: staff, admins, and students from same cohort
// Staff/Admins can search all users
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get current user's full details including role
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build base search conditions
    const searchConditions = query.trim() ? {
      OR: [
        { displayName: { contains: query } },
        { username: { contains: query } },
        { email: { contains: query } }
      ]
    } : {}

    let users

    if (currentUser.role === 'ADMIN') {
      // Admins can search all active users
      users = await prisma.user.findMany({
        where: {
          id: { not: user.userId },
          isActive: true,
          ...searchConditions
        },
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true
        },
        orderBy: [
          { role: 'asc' },
          { displayName: 'asc' },
          { username: 'asc' }
        ],
        take: limit
      })
    } else if (currentUser.role === 'STAFF') {
      // Staff can only search:
      // 1. All admins and other staff
      // 2. Students enrolled in cohorts they are assigned to

      // Get staff's assigned cohort IDs
      const staffAssignments = await prisma.staffAssignment.findMany({
        where: { userId: user.userId },
        select: { cohortId: true }
      })
      const assignedCohortIds = staffAssignments.map(sa => sa.cohortId)

      // Get student IDs from assigned cohorts
      const cohortStudentIds = assignedCohortIds.length > 0
        ? (await prisma.enrollment.findMany({
            where: {
              cohortId: { in: assignedCohortIds },
              status: 'ACTIVE'
            },
            select: { userId: true }
          })).map(e => e.userId)
        : []

      users = await prisma.user.findMany({
        where: {
          id: { not: user.userId },
          isActive: true,
          ...searchConditions,
          OR: [
            // Admins and other staff are always searchable
            { role: { in: ['ADMIN', 'STAFF'] } },
            // Students from assigned cohorts only
            ...(cohortStudentIds.length > 0
              ? [{ id: { in: cohortStudentIds }, role: 'STUDENT' }]
              : [])
          ]
        },
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true
        },
        orderBy: [
          { role: 'asc' },
          { displayName: 'asc' },
          { username: 'asc' }
        ],
        take: limit
      })
    } else {
      // Students can only search:
      // 1. All staff and admins
      // 2. Students enrolled in the same cohort(s)

      // Get student's enrolled cohort IDs
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: user.userId,
          status: 'ACTIVE'
        },
        select: { cohortId: true }
      })
      const cohortIds = enrollments.map(e => e.cohortId)

      // Get student IDs from same cohorts
      const cohortStudentIds = cohortIds.length > 0
        ? (await prisma.enrollment.findMany({
            where: {
              cohortId: { in: cohortIds },
              status: 'ACTIVE',
              userId: { not: user.userId }
            },
            select: { userId: true }
          })).map(e => e.userId)
        : []

      users = await prisma.user.findMany({
        where: {
          id: { not: user.userId },
          isActive: true,
          ...searchConditions,
          OR: [
            // Staff and Admins are always searchable
            { role: { in: ['ADMIN', 'STAFF'] } },
            // Students from same cohort
            ...(cohortStudentIds.length > 0
              ? [{ id: { in: cohortStudentIds }, role: 'STUDENT' }]
              : [])
          ]
        },
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true
        },
        orderBy: [
          { role: 'asc' }, // Show staff/admins first
          { displayName: 'asc' },
          { username: 'asc' }
        ],
        take: limit
      })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
  }
}
