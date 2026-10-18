import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Helper to get accessible cohort IDs for staff
async function getAccessibleCohortIds(userId: string, role: string): Promise<string[] | null> {
  if (role === 'ADMIN') {
    return null; // null means all cohorts
  }

  const staffAssignments = await prisma.staffAssignment.findMany({
    where: { userId },
    select: { cohortId: true }
  });

  return staffAssignments.map(sa => sa.cohortId);
}

// GET /api/analytics - Get analytics data (staff/admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Staff or admin access required' }, { status: 403 });
    }

    // RLS: Get accessible cohorts for staff
    const accessibleCohortIds = await getAccessibleCohortIds(user.userId, user.role);

    // Staff with no cohort assignments get empty analytics
    if (accessibleCohortIds !== null && accessibleCohortIds.length === 0) {
      return NextResponse.json({
        overview: {
          totalStudents: 0,
          totalCohorts: 0,
          totalLessons: 0,
          totalSubmissions: 0,
          activeStudents: 0,
          pendingSubmissions: 0,
          activeRate: 0,
        },
        enrollmentTrends: [],
        submissionStats: [],
        gradeDistribution: [],
        completionRates: [],
        cohortPerformance: [],
        recentActivity: { submissions: 0, enrollments: 0, graded: 0, period: 'Last 7 days' },
        topStudents: [],
        lessonsNeedingAttention: [],
        message: 'No cohorts assigned. Contact admin to be assigned to a cohort.'
      });
    }

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');
    const period = searchParams.get('period') || '30'; // days

    // Verify staff has access to requested cohort
    if (cohortId && accessibleCohortIds !== null && !accessibleCohortIds.includes(cohortId)) {
      return NextResponse.json({ error: 'Not authorized to access this cohort' }, { status: 403 });
    }

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Determine effective cohort filter (specific cohort OR accessible cohorts for staff)
    const effectiveCohortIds = cohortId ? [cohortId] : accessibleCohortIds;

    // Build RLS filters for queries
    const cohortWhereFilter = effectiveCohortIds !== null
      ? { cohortId: { in: effectiveCohortIds } }
      : {};
    const enrollmentCohortFilter = effectiveCohortIds !== null
      ? { enrollments: { some: { cohortId: { in: effectiveCohortIds } } } }
      : {};
    const submissionCohortFilter = effectiveCohortIds !== null
      ? { assignment: { cohortId: { in: effectiveCohortIds } } }
      : {};

    // Get overview stats with RLS
    const [
      totalStudents,
      totalCohorts,
      totalLessons,
      totalSubmissions,
      activeStudents,
      pendingSubmissions,
    ] = await Promise.all([
      // Count students enrolled in accessible cohorts
      effectiveCohortIds !== null
        ? prisma.enrollment.findMany({
            where: { cohortId: { in: effectiveCohortIds }, status: 'ACTIVE' },
            select: { userId: true },
            distinct: ['userId']
          }).then(e => e.length)
        : prisma.user.count({ where: { role: 'STUDENT' } }),
      // Count accessible cohorts
      effectiveCohortIds !== null
        ? effectiveCohortIds.length
        : prisma.cohort.count(),
      prisma.lesson.count(),
      // Count submissions from accessible cohorts
      effectiveCohortIds !== null
        ? prisma.submission.count({ where: submissionCohortFilter })
        : prisma.submission.count(),
      // Count active students in accessible cohorts
      effectiveCohortIds !== null
        ? prisma.user.count({
            where: {
              role: 'STUDENT',
              lastLoginAt: { gte: startDate },
              ...enrollmentCohortFilter,
            },
          })
        : prisma.user.count({
            where: {
              role: 'STUDENT',
              lastLoginAt: { gte: startDate },
            },
          }),
      // Count pending submissions from accessible cohorts
      effectiveCohortIds !== null
        ? prisma.submission.count({
            where: {
              status: 'SUBMITTED',
              gradedAt: null,
              ...submissionCohortFilter,
            },
          })
        : prisma.submission.count({
            where: {
              status: 'SUBMITTED',
              gradedAt: null,
            },
          }),
    ]);

    // Get enrollment trends (last N days) with RLS
    const enrollmentTrends = await getEnrollmentTrends(periodDays, effectiveCohortIds);

    // Get submission stats by status with RLS
    const submissionStats = await prisma.submission.groupBy({
      by: ['status'],
      _count: { id: true },
      where: effectiveCohortIds !== null
        ? { assignment: { cohortId: { in: effectiveCohortIds } } }
        : {},
    });

    // Get grade distribution with RLS
    const gradeDistribution = await getGradeDistribution(effectiveCohortIds);

    // Get completion rates by lesson with RLS
    const completionRates = await getCompletionRates(effectiveCohortIds);

    // Get cohort performance comparison with RLS
    const cohortPerformance = await getCohortPerformance(effectiveCohortIds);

    // Get recent activity with RLS
    const recentActivity = await getRecentActivity(7, effectiveCohortIds);

    // Get top performing students with RLS
    const topStudents = await getTopStudents(effectiveCohortIds, 5);

    // Get lessons needing attention (low completion) with RLS
    const lessonsNeedingAttention = await getLessonsNeedingAttention(effectiveCohortIds, 5);

    return NextResponse.json({
      overview: {
        totalStudents,
        totalCohorts,
        totalLessons,
        totalSubmissions,
        activeStudents,
        pendingSubmissions,
        activeRate: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
      },
      enrollmentTrends,
      submissionStats: submissionStats.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      gradeDistribution,
      completionRates,
      cohortPerformance,
      recentActivity,
      topStudents,
      lessonsNeedingAttention,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}

async function getEnrollmentTrends(days: number, cohortIds: string[] | null) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Fetch all enrollments in the date range with RLS filter
  const enrollments = await prisma.enrollment.findMany({
    where: {
      enrolledAt: { gte: startDate },
      ...(cohortIds !== null ? { cohortId: { in: cohortIds } } : {}),
    },
    select: { enrolledAt: true },
  });

  // Group by date in memory
  const countByDate = new Map<string, number>();

  // Initialize all dates with 0
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    countByDate.set(dateStr, 0);
  }

  // Count enrollments per date
  enrollments.forEach((e) => {
    if (e.enrolledAt) {
      const dateStr = new Date(e.enrolledAt).toISOString().split('T')[0];
      if (countByDate.has(dateStr)) {
        countByDate.set(dateStr, (countByDate.get(dateStr) || 0) + 1);
      }
    }
  });

  // Convert to array
  return Array.from(countByDate.entries())
    .map(([date, enrollments]) => ({ date, enrollments }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getGradeDistribution(cohortIds: string[] | null) {
  const submissions = await prisma.submission.findMany({
    where: {
      score: { not: null },
      ...(cohortIds !== null
        ? { assignment: { cohortId: { in: cohortIds } } }
        : {}),
    },
    select: {
      score: true,
      assignment: {
        select: { maxPoints: true },
      },
    },
  });

  const distribution = {
    A: 0, // 90-100%
    B: 0, // 80-89%
    C: 0, // 70-79%
    D: 0, // 60-69%
    F: 0, // 0-59%
  };

  submissions.forEach((s) => {
    if (s.score !== null && s.assignment.maxPoints && s.assignment.maxPoints > 0) {
      const percentage = (s.score / s.assignment.maxPoints) * 100;
      if (percentage >= 90) distribution.A++;
      else if (percentage >= 80) distribution.B++;
      else if (percentage >= 70) distribution.C++;
      else if (percentage >= 60) distribution.D++;
      else distribution.F++;
    }
  });

  return Object.entries(distribution).map(([grade, count]) => ({
    grade,
    count,
  }));
}

async function getCompletionRates(cohortIds: string[] | null) {
  // Get assignments with their submissions - completion is based on assignments
  const assignments = await prisma.assignment.findMany({
    where: cohortIds !== null ? { cohortId: { in: cohortIds } } : {},
    include: {
      submissions: {
        where: { status: { in: ['SUBMITTED', 'GRADED'] } },
      },
      cohort: {
        include: {
          enrollments: true,
        },
      },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  return assignments.map((assignment) => {
    const totalStudents = assignment.cohort.enrollments.length;
    const submissionCount = assignment.submissions.length;

    return {
      lessonId: assignment.id,
      lessonTitle: assignment.title,
      completionRate:
        totalStudents > 0
          ? Math.round((submissionCount / totalStudents) * 100)
          : 0,
    };
  });
}

async function getCohortPerformance(cohortIds: string[] | null) {
  const cohorts = await prisma.cohort.findMany({
    where: cohortIds !== null ? { id: { in: cohortIds } } : {},
    include: {
      enrollments: true,
      assignments: {
        include: {
          submissions: {
            where: { score: { not: null } },
            select: { score: true },
          },
        },
      },
    },
  });

  return cohorts.map((cohort) => {
    const allGrades: number[] = [];
    cohort.assignments.forEach((a) => {
      const maxPoints = a.maxPoints || 100;
      a.submissions.forEach((s) => {
        if (s.score !== null && maxPoints > 0) {
          allGrades.push((s.score / maxPoints) * 100);
        }
      });
    });

    const avgGrade =
      allGrades.length > 0
        ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
        : 0;

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      studentCount: cohort.enrollments.length,
      avgGrade,
      submissionCount: allGrades.length,
    };
  });
}

async function getRecentActivity(days: number, cohortIds: string[] | null) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const submissionCohortFilter = cohortIds !== null
    ? { assignment: { cohortId: { in: cohortIds } } }
    : {};
  const enrollmentCohortFilter = cohortIds !== null
    ? { cohortId: { in: cohortIds } }
    : {};

  const [recentSubmissions, recentEnrollments, recentGrades] = await Promise.all([
    prisma.submission.count({
      where: { submittedAt: { gte: startDate }, ...submissionCohortFilter },
    }),
    prisma.enrollment.count({
      where: { enrolledAt: { gte: startDate }, ...enrollmentCohortFilter },
    }),
    prisma.submission.count({
      where: { gradedAt: { gte: startDate }, ...submissionCohortFilter },
    }),
  ]);

  return {
    submissions: recentSubmissions,
    enrollments: recentEnrollments,
    graded: recentGrades,
    period: `Last ${days} days`,
  };
}

async function getTopStudents(cohortIds: string[] | null, limit: number) {
  // Get all submissions with user and assignment data in a single query
  const submissions = await prisma.submission.findMany({
    where: {
      score: { not: null },
      ...(cohortIds !== null ? { assignment: { cohortId: { in: cohortIds } } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
      assignment: { select: { maxPoints: true } },
    },
  });

  // Group submissions by user and calculate averages in memory
  const userGrades = new Map<
    string,
    {
      user: { id: string; displayName: string | null; username: string; avatarUrl: string | null };
      grades: number[];
    }
  >();

  submissions.forEach((s) => {
    if (s.score !== null && s.assignment.maxPoints && s.assignment.maxPoints > 0) {
      const percentage = (s.score / s.assignment.maxPoints) * 100;

      if (!userGrades.has(s.user.id)) {
        userGrades.set(s.user.id, { user: s.user, grades: [] });
      }
      userGrades.get(s.user.id)!.grades.push(percentage);
    }
  });

  // Calculate averages and sort
  const studentPerformance = Array.from(userGrades.entries()).map(([userId, data]) => {
    const avgGrade =
      data.grades.length > 0
        ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length
        : 0;

    return {
      userId,
      displayName: data.user.displayName || data.user.username,
      avatarUrl: data.user.avatarUrl,
      avgGrade: Math.round(avgGrade),
      submissionCount: data.grades.length,
    };
  });

  return studentPerformance
    .filter((s) => s.submissionCount > 0)
    .sort((a, b) => b.avgGrade - a.avgGrade)
    .slice(0, limit);
}

async function getLessonsNeedingAttention(cohortIds: string[] | null, limit: number) {
  // Get assignments with low submission rates
  const assignments = await prisma.assignment.findMany({
    where: cohortIds !== null ? { cohortId: { in: cohortIds } } : {},
    include: {
      submissions: {
        where: { status: { in: ['SUBMITTED', 'GRADED'] } },
      },
      cohort: {
        include: {
          enrollments: true,
        },
      },
      module: { select: { title: true } },
    },
  });

  const assignmentsWithRates = assignments.map((assignment) => {
    const totalStudents = assignment.cohort.enrollments.length;
    const submissionCount = assignment.submissions.length;
    const completionRate =
      totalStudents > 0
        ? Math.round((submissionCount / totalStudents) * 100)
        : 100;

    return {
      lessonId: assignment.id,
      lessonTitle: assignment.title,
      moduleName: assignment.module?.title || 'No Module',
      completionRate,
      totalStudents,
    };
  });

  return assignmentsWithRates
    .filter((a) => a.completionRate < 50 && a.totalStudents > 0)
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, limit);
}
