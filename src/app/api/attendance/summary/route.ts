import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/attendance/summary - Get attendance statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cohortId = searchParams.get('cohortId')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Students can only see their own summary
    if (!isAdmin(user) && !isStaff(user) && userId && userId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build where clause
    const where: Record<string, unknown> = {}

    if (cohortId) {
      where.session = { cohortId }
    }

    if (userId) {
      where.userId = userId
    } else if (!isAdmin(user) && !isStaff(user)) {
      where.userId = user.userId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate)
      }
    }

    // Get attendance counts by status
    const [present, absent, late, excused] = await Promise.all([
      prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      prisma.attendance.count({ where: { ...where, status: 'LATE' } }),
      prisma.attendance.count({ where: { ...where, status: 'EXCUSED' } })
    ])

    const total = present + absent + late + excused
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0

    // Get per-student breakdown if cohortId is specified
    let studentBreakdown = null
    if (cohortId && (isAdmin(user) || isStaff(user))) {
      const enrollments = await prisma.enrollment.findMany({
        where: { cohortId, status: 'ACTIVE' },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true
            }
          }
        }
      })

      studentBreakdown = await Promise.all(
        enrollments.map(async (enrollment) => {
          const studentWhere = { ...where, userId: enrollment.userId }
          const [studentPresent, studentAbsent, studentLate, studentExcused] = await Promise.all([
            prisma.attendance.count({ where: { ...studentWhere, status: 'PRESENT' } }),
            prisma.attendance.count({ where: { ...studentWhere, status: 'ABSENT' } }),
            prisma.attendance.count({ where: { ...studentWhere, status: 'LATE' } }),
            prisma.attendance.count({ where: { ...studentWhere, status: 'EXCUSED' } })
          ])

          const studentTotal = studentPresent + studentAbsent + studentLate + studentExcused
          const studentRate = studentTotal > 0 ? ((studentPresent + studentLate) / studentTotal) * 100 : 0

          return {
            user: enrollment.user,
            stats: {
              present: studentPresent,
              absent: studentAbsent,
              late: studentLate,
              excused: studentExcused,
              total: studentTotal,
              attendanceRate: Math.round(studentRate * 10) / 10
            }
          }
        })
      )
    }

    return NextResponse.json({
      summary: {
        present,
        absent,
        late,
        excused,
        total,
        attendanceRate: Math.round(attendanceRate * 10) / 10
      },
      studentBreakdown
    })
  } catch (error) {
    console.error('Error fetching attendance summary:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance summary' }, { status: 500 })
  }
}
