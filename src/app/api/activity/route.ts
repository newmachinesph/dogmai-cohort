import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/activity - Get recent activity feed
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cohortId = searchParams.get('cohortId');

    const activities: any[] = [];

    if (user.role === 'STUDENT') {
      // Get student's enrolled cohorts
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId },
        select: { cohortId: true },
      });
      const cohortIds = enrollments.map(e => e.cohortId);

      // Recent announcements for enrolled cohorts
      const announcements = await prisma.announcement.findMany({
        where: {
          cohortId: { in: cohortIds },
        },
        include: {
          createdBy: { select: { displayName: true, username: true } },
          cohort: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      announcements.forEach(a => {
        activities.push({
          id: `announcement-${a.id}`,
          type: 'ANNOUNCEMENT',
          title: a.title,
          description: a.content.substring(0, 100) + (a.content.length > 100 ? '...' : ''),
          actor: a.createdBy.displayName || a.createdBy.username,
          cohortName: a.cohort.name,
          createdAt: a.createdAt,
          link: `/student/announcements`,
        });
      });

      // Recent grades
      const recentGrades = await prisma.submission.findMany({
        where: {
          userId: user.userId,
          status: 'GRADED',
          gradedAt: { not: null },
        },
        include: {
          assignment: {
            select: { title: true, maxPoints: true },
          },
        },
        orderBy: { gradedAt: 'desc' },
        take: 5,
      });

      recentGrades.forEach(g => {
        activities.push({
          id: `grade-${g.id}`,
          type: 'GRADE_RECEIVED',
          title: `Grade: ${g.score}/${g.assignment.maxPoints || 100}`,
          description: `${g.assignment.title} was graded`,
          actor: 'Instructor',
          createdAt: g.gradedAt,
          link: `/student/submissions/${g.id}`,
        });
      });

      // New assignments
      const newAssignments = await prisma.assignment.findMany({
        where: {
          cohortId: { in: cohortIds },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          cohort: { select: { name: true } },
          module: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      newAssignments.forEach(a => {
        activities.push({
          id: `assignment-${a.id}`,
          type: 'NEW_ASSIGNMENT',
          title: a.title,
          description: a.module ? `New assignment in ${a.module.title}` : 'New assignment',
          cohortName: a.cohort.name,
          createdAt: a.createdAt,
          dueDate: a.dueDate,
          link: `/student/assignments/${a.id}`,
        });
      });
    } else {
      // Staff/Admin view
      // Build cohort filter for staff
      let cohortIds: string[] = [];
      if (cohortId) {
        cohortIds = [cohortId];
      } else if (user.role === 'STAFF') {
        const staffCohorts = await prisma.cohort.findMany({
          where: {
            staffAssignments: { some: { userId: user.userId } },
          },
          select: { id: true },
        });
        cohortIds = staffCohorts.map(c => c.id);
      }

      // Recent submissions
      const submissions = await prisma.submission.findMany({
        where: {
          status: 'SUBMITTED',
          ...(cohortIds.length > 0 ? { assignment: { cohortId: { in: cohortIds } } } : {}),
        },
        include: {
          user: { select: { displayName: true, username: true, avatarUrl: true } },
          assignment: {
            select: {
              title: true,
              cohort: { select: { name: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      });

      submissions.forEach(s => {
        activities.push({
          id: `submission-${s.id}`,
          type: 'NEW_SUBMISSION',
          title: `New submission`,
          description: `${s.user.displayName || s.user.username} submitted ${s.assignment.title}`,
          actor: s.user.displayName || s.user.username,
          avatarUrl: s.user.avatarUrl,
          cohortName: s.assignment.cohort.name,
          createdAt: s.submittedAt,
          link: `/staff/grading`,
        });
      });

      // Recent enrollments
      const enrollments = await prisma.enrollment.findMany({
        where: {
          enrolledAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          ...(cohortIds.length > 0 ? { cohortId: { in: cohortIds } } : {}),
        },
        include: {
          user: { select: { displayName: true, username: true, avatarUrl: true } },
          cohort: { select: { name: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        take: 5,
      });

      enrollments.forEach(e => {
        activities.push({
          id: `enrollment-${e.id}`,
          type: 'NEW_ENROLLMENT',
          title: 'New student enrolled',
          description: `${e.user.displayName || e.user.username} joined ${e.cohort.name}`,
          actor: e.user.displayName || e.user.username,
          avatarUrl: e.user.avatarUrl,
          cohortName: e.cohort.name,
          createdAt: e.enrolledAt,
          link: `/staff/students`,
        });
      });

      // Recent graded submissions
      const gradedSubmissions = await prisma.submission.findMany({
        where: {
          status: 'GRADED',
          gradedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          ...(cohortIds.length > 0 ? { assignment: { cohortId: { in: cohortIds } } } : {}),
        },
        include: {
          user: { select: { displayName: true, username: true } },
          assignment: {
            select: {
              title: true,
              maxPoints: true,
              cohort: { select: { name: true } },
            },
          },
        },
        orderBy: { gradedAt: 'desc' },
        take: 5,
      });

      gradedSubmissions.forEach(s => {
        activities.push({
          id: `graded-${s.id}`,
          type: 'SUBMISSION_GRADED',
          title: `Graded: ${s.score}/${s.assignment.maxPoints}`,
          description: `${s.user.displayName || s.user.username}'s ${s.assignment.title}`,
          actor: 'Instructor',
          cohortName: s.assignment.cohort.name,
          createdAt: s.gradedAt,
          link: `/staff/grading`,
        });
      });
    }

    // Sort all activities by date
    activities.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      activities: activities.slice(0, limit),
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
