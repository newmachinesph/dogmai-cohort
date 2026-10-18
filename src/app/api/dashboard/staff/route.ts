import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/dashboard/staff - Get staff dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (!isAdmin(user) && !isStaff(user))) {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    // Get staff's assigned cohorts
    const staffAssignments = await prisma.staffAssignment.findMany({
      where: { userId: user.userId },
      include: {
        cohort: {
          include: {
            _count: {
              select: {
                enrollments: true,
                assignments: true,
                announcements: true
              }
            }
          }
        }
      }
    })

    const cohortIds = staffAssignments.map(a => a.cohortId)

    // Get statistics for assigned cohorts
    const [
      totalStudents,
      totalAssignments,
      publishedAssignments,
      totalSubmissions,
      pendingGrading,
      recentSubmissions
    ] = await Promise.all([
      prisma.enrollment.count({
        where: { cohortId: { in: cohortIds }, status: 'ACTIVE' }
      }),
      prisma.assignment.count({
        where: { cohortId: { in: cohortIds } }
      }),
      prisma.assignment.count({
        where: { cohortId: { in: cohortIds }, isPublished: true }
      }),
      prisma.submission.count({
        where: { assignment: { cohortId: { in: cohortIds } } }
      }),
      prisma.submission.count({
        where: {
          assignment: { cohortId: { in: cohortIds } },
          status: { in: ['SUBMITTED', 'LATE'] }
        }
      }),
      prisma.submission.findMany({
        where: {
          assignment: { cohortId: { in: cohortIds } },
          status: { in: ['SUBMITTED', 'LATE'] }
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true
            }
          },
          assignment: {
            select: {
              id: true,
              title: true,
              dueDate: true,
              cohort: { select: { name: true } }
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        take: 10
      })
    ])

    // Upcoming classes (based on cohort schedule)
    const now = new Date()
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        cohortId: { in: cohortIds },
        isPublished: true,
        dueDate: { gte: now }
      },
      include: {
        cohort: { select: { name: true } },
        _count: { select: { submissions: true } }
      },
      orderBy: { dueDate: 'asc' },
      take: 5
    })

    // Recent announcements
    const recentAnnouncements = await prisma.announcement.findMany({
      where: { cohortId: { in: cohortIds } },
      include: {
        cohort: { select: { name: true } },
        createdBy: {
          select: {
            displayName: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Today's attendance summary
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendance = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        session: {
          cohortId: { in: cohortIds },
          date: { gte: today, lt: tomorrow }
        }
      },
      _count: { id: true }
    })

    // Per-cohort stats
    const cohortStats = await Promise.all(
      staffAssignments.map(async (assignment) => {
        const cohort = assignment.cohort
        const [enrolled, submissionsToGrade, attendanceToday] = await Promise.all([
          prisma.enrollment.count({
            where: { cohortId: cohort.id, status: 'ACTIVE' }
          }),
          prisma.submission.count({
            where: {
              assignment: { cohortId: cohort.id },
              status: { in: ['SUBMITTED', 'LATE'] }
            }
          }),
          prisma.attendance.count({
            where: {
              session: {
                cohortId: cohort.id,
                date: { gte: today, lt: tomorrow }
              }
            }
          })
        ])

        return {
          cohort: {
            id: cohort.id,
            name: cohort.name,
            status: cohort.status,
            location: cohort.location
          },
          role: assignment.role,
          stats: {
            enrolled,
            submissionsToGrade,
            attendanceRecorded: attendanceToday > 0
          }
        }
      })
    )

    return NextResponse.json({
      stats: {
        cohorts: staffAssignments.length,
        students: totalStudents,
        assignments: totalAssignments,
        publishedAssignments,
        submissions: totalSubmissions,
        pendingGrading
      },
      myCohorts: cohortStats,
      pendingSubmissions: recentSubmissions,
      upcomingAssignments,
      recentAnnouncements,
      todayAttendance: todayAttendance.map(a => ({
        status: a.status,
        count: a._count.id
      }))
    })
  } catch (error) {
    console.error('Error fetching staff dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
