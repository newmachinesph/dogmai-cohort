import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin } from '@/lib/auth'

// GET /api/dashboard/admin - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get counts
    const [
      totalUsers,
      totalStudents,
      totalStaff,
      activeUsers,
      totalCohorts,
      activeCohorts,
      upcomingCohorts,
      completedCohorts,
      totalEnrollments,
      activeEnrollments,
      totalAssignments,
      totalSubmissions,
      pendingGrading
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STAFF' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.cohort.count(),
      prisma.cohort.count({ where: { status: 'ACTIVE' } }),
      prisma.cohort.count({ where: { status: 'UPCOMING' } }),
      prisma.cohort.count({ where: { status: 'COMPLETED' } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      prisma.assignment.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: { in: ['SUBMITTED', 'LATE'] } } })
    ])

    // Recent activity
    const recentUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const recentEnrollments = await prisma.enrollment.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true
          }
        },
        cohort: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { enrolledAt: 'desc' },
      take: 5
    })

    // Cohort breakdown by location
    const cohortsByLocation = await prisma.cohort.groupBy({
      by: ['location'],
      _count: { id: true }
    })

    // Cohort breakdown by status
    const cohortsByStatus = await prisma.cohort.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    // Active cohorts with enrollment counts
    const activeCohortDetails = await prisma.cohort.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            enrollments: true,
            staffAssignments: true,
            assignments: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    // Submission stats by status
    const submissionsByStatus = await prisma.submission.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    return NextResponse.json({
      stats: {
        users: {
          total: totalUsers,
          students: totalStudents,
          staff: totalStaff,
          active: activeUsers
        },
        cohorts: {
          total: totalCohorts,
          active: activeCohorts,
          upcoming: upcomingCohorts,
          completed: completedCohorts
        },
        enrollments: {
          total: totalEnrollments,
          active: activeEnrollments
        },
        assignments: {
          total: totalAssignments,
          submissions: totalSubmissions,
          pendingGrading
        }
      },
      charts: {
        cohortsByLocation: cohortsByLocation.map(c => ({
          location: c.location,
          count: c._count.id
        })),
        cohortsByStatus: cohortsByStatus.map(c => ({
          status: c.status,
          count: c._count.id
        })),
        submissionsByStatus: submissionsByStatus.map(s => ({
          status: s.status,
          count: s._count.id
        }))
      },
      recent: {
        users: recentUsers,
        enrollments: recentEnrollments
      },
      activeCohorts: activeCohortDetails
    })
  } catch (error) {
    console.error('Error fetching admin dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
