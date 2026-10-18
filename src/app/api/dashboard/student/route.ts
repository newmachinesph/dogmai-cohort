import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/dashboard/student - Get student dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student's enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.userId },
      include: {
        cohort: {
          include: {
            _count: {
              select: {
                enrollments: true,
                assignments: true
              }
            }
          }
        }
      }
    })

    const cohortIds = enrollments
      .filter(e => e.status === 'ACTIVE')
      .map(e => e.cohortId)

    // If user has no active enrollments, return empty dashboard
    if (cohortIds.length === 0) {
      return NextResponse.json({
        enrollments: enrollments.map(e => ({
          id: e.id,
          status: e.status,
          enrolledAt: e.enrolledAt,
          cohort: {
            id: e.cohort.id,
            name: e.cohort.name,
            status: e.cohort.status,
            location: e.cohort.location,
            startDate: e.cohort.startDate,
            endDate: e.cohort.endDate
          }
        })),
        progress: {
          lessons: { total: 0, completed: 0, inProgress: 0, percentage: 0 },
          assignments: { total: 0, submitted: 0, graded: 0, percentage: 0 },
          averageGrade: 0,
          attendance: { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: 0 }
        },
        pendingAssignments: [],
        upcomingAssignments: [],
        recentAnnouncements: [],
        recentGrades: [],
        mySubmissions: [],
        message: 'You are not enrolled in any active cohorts yet.'
      })
    }

    // Get module IDs for enrolled cohorts (only unlocked modules)
    const cohortModules = await prisma.cohortModule.findMany({
      where: {
        cohortId: { in: cohortIds },
        isLocked: false
      },
      select: { moduleId: true }
    })
    const moduleIds = cohortModules.map(cm => cm.moduleId)

    // Get assignments and progress
    const [
      totalAssignments,
      submittedAssignments,
      gradedSubmissions,
      pendingAssignments,
      upcomingAssignments,
      totalLessons,
      completedLessons,
      inProgressLessons,
      recentAnnouncements,
      recentGrades,
      mySubmissions
    ] = await Promise.all([
      // Total assignments for enrolled cohorts
      prisma.assignment.count({
        where: { cohortId: { in: cohortIds }, isPublished: true }
      }),
      // Submitted assignments (only for enrolled cohorts)
      prisma.submission.count({
        where: {
          userId: user.userId,
          status: { not: 'DRAFT' },
          assignment: { cohortId: { in: cohortIds } }
        }
      }),
      // Graded submissions (only for enrolled cohorts)
      prisma.submission.count({
        where: {
          userId: user.userId,
          status: 'GRADED',
          assignment: { cohortId: { in: cohortIds } }
        }
      }),
      // Pending (not submitted) assignments
      prisma.assignment.findMany({
        where: {
          cohortId: { in: cohortIds },
          isPublished: true,
          dueDate: { gte: new Date() },
          submissions: {
            none: { userId: user.userId }
          }
        },
        include: {
          cohort: { select: { name: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),
      // Upcoming assignments
      prisma.assignment.findMany({
        where: {
          cohortId: { in: cohortIds },
          isPublished: true,
          dueDate: { gte: new Date() }
        },
        include: {
          cohort: { select: { name: true } },
          submissions: {
            where: { userId: user.userId },
            select: { status: true, score: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),
      // Total lessons (only from unlocked modules in enrolled cohorts)
      prisma.lesson.count({
        where: {
          isPublished: true,
          moduleId: { in: moduleIds.length > 0 ? moduleIds : ['_none_'] }
        }
      }),
      // Completed lessons (only from enrolled cohort modules)
      prisma.lessonProgress.count({
        where: {
          userId: user.userId,
          status: 'COMPLETED',
          lesson: { moduleId: { in: moduleIds.length > 0 ? moduleIds : ['_none_'] } }
        }
      }),
      // In progress lessons (only from enrolled cohort modules)
      prisma.lessonProgress.count({
        where: {
          userId: user.userId,
          status: 'IN_PROGRESS',
          lesson: { moduleId: { in: moduleIds.length > 0 ? moduleIds : ['_none_'] } }
        }
      }),
      // Recent announcements
      prisma.announcement.findMany({
        where: {
          cohortId: { in: cohortIds },
          publishedAt: { not: null, lte: new Date() },
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ]
        },
        include: {
          cohort: { select: { name: true } },
          createdBy: {
            select: { displayName: true, username: true }
          }
        },
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { publishedAt: 'desc' }
        ],
        take: 5
      }),
      // Recent grades
      prisma.submission.findMany({
        where: {
          userId: user.userId,
          status: 'GRADED',
          gradedAt: { not: null }
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              maxPoints: true,
              passingScore: true,
              cohort: { select: { name: true } }
            }
          }
        },
        orderBy: { gradedAt: 'desc' },
        take: 5
      }),
      // My recent submissions
      prisma.submission.findMany({
        where: { userId: user.userId },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              maxPoints: true,
              cohort: { select: { name: true } }
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        take: 5
      })
    ])

    // Calculate progress percentage
    const lessonProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

    const assignmentProgress = totalAssignments > 0
      ? Math.round((submittedAssignments / totalAssignments) * 100)
      : 0

    // Calculate average grade (only for enrolled cohorts)
    const allGradedSubmissions = await prisma.submission.findMany({
      where: {
        userId: user.userId,
        status: 'GRADED',
        score: { not: null },
        assignment: { cohortId: { in: cohortIds } }
      },
      include: {
        assignment: { select: { maxPoints: true } }
      }
    })

    let averageGrade = 0
    if (allGradedSubmissions.length > 0) {
      const totalPercentage = allGradedSubmissions.reduce((sum, sub) => {
        return sum + ((sub.score || 0) / sub.assignment.maxPoints) * 100
      }, 0)
      averageGrade = Math.round(totalPercentage / allGradedSubmissions.length)
    }

    // Attendance summary
    const attendanceStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        userId: user.userId,
        session: { cohortId: { in: cohortIds } }
      },
      _count: { id: true }
    })

    const attendanceSummary = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0,
      rate: 0
    }

    attendanceStats.forEach(stat => {
      const count = stat._count.id
      attendanceSummary.total += count
      switch (stat.status) {
        case 'PRESENT': attendanceSummary.present = count; break
        case 'ABSENT': attendanceSummary.absent = count; break
        case 'LATE': attendanceSummary.late = count; break
        case 'EXCUSED': attendanceSummary.excused = count; break
      }
    })

    if (attendanceSummary.total > 0) {
      attendanceSummary.rate = Math.round(
        ((attendanceSummary.present + attendanceSummary.late) / attendanceSummary.total) * 100
      )
    }

    return NextResponse.json({
      enrollments: enrollments.map(e => ({
        id: e.id,
        status: e.status,
        enrolledAt: e.enrolledAt,
        cohort: {
          id: e.cohort.id,
          name: e.cohort.name,
          status: e.cohort.status,
          location: e.cohort.location,
          startDate: e.cohort.startDate,
          endDate: e.cohort.endDate
        }
      })),
      progress: {
        lessons: {
          total: totalLessons,
          completed: completedLessons,
          inProgress: inProgressLessons,
          percentage: lessonProgress
        },
        assignments: {
          total: totalAssignments,
          submitted: submittedAssignments,
          graded: gradedSubmissions,
          percentage: assignmentProgress
        },
        averageGrade,
        attendance: attendanceSummary
      },
      pendingAssignments,
      upcomingAssignments: upcomingAssignments.map(a => ({
        ...a,
        mySubmission: a.submissions[0] || null,
        submissions: undefined
      })),
      recentAnnouncements,
      recentGrades,
      mySubmissions
    })
  } catch (error) {
    console.error('Error fetching student dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
