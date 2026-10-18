import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/calendar - Get calendar events
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const cohortId = searchParams.get('cohortId');

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const events: any[] = [];

    if (user.role === 'STUDENT') {
      // Get student's enrolled cohorts
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId },
        include: {
          cohort: {
            include: {
              assignments: true,
            },
          },
        },
      });

      // Add cohort start/end dates
      enrollments.forEach((enrollment) => {
        if (enrollment.cohort.startDate) {
          events.push({
            id: `cohort-start-${enrollment.cohort.id}`,
            title: `${enrollment.cohort.name} Starts`,
            start: enrollment.cohort.startDate,
            allDay: true,
            type: 'cohort',
            color: '#2563eb',
          });
        }
        if (enrollment.cohort.endDate) {
          events.push({
            id: `cohort-end-${enrollment.cohort.id}`,
            title: `${enrollment.cohort.name} Ends`,
            start: enrollment.cohort.endDate,
            allDay: true,
            type: 'cohort',
            color: '#dc2626',
          });
        }

        // Add assignment due dates
        enrollment.cohort.assignments.forEach((assignment) => {
          if (assignment.dueDate) {
            events.push({
              id: `assignment-${assignment.id}`,
              title: `Due: ${assignment.title}`,
              start: assignment.dueDate,
              allDay: true,
              type: 'assignment',
              color: '#f59e0b',
              url: `/student/assignments/${assignment.id}`,
              extendedProps: {
                cohortName: enrollment.cohort.name,
                assignmentId: assignment.id,
                maxPoints: assignment.maxPoints,
              },
            });
          }
        });
      });

      // Add attendance sessions
      const sessions = await prisma.session.findMany({
        where: {
          cohort: {
            enrollments: {
              some: { userId: user.userId },
            },
          },
          date: {
            gte: start,
            lte: end,
          },
        },
        include: {
          cohort: true,
          attendance: {
            where: { userId: user.userId },
          },
        },
      });

      sessions.forEach((session) => {
        const userAttendance = session.attendance[0];
        events.push({
          id: `session-${session.id}`,
          title: session.title || `Session: ${session.cohort.name}`,
          start: session.date,
          allDay: true,
          type: 'session',
          color: userAttendance?.status === 'PRESENT' ? '#16a34a' : userAttendance?.status === 'ABSENT' ? '#dc2626' : '#64748b',
          extendedProps: {
            status: userAttendance?.status || 'PENDING',
            cohortName: session.cohort.name,
          },
        });
      });
    } else {
      // Staff/Admin view
      const whereClause = cohortId
        ? { id: cohortId }
        : user.role === 'STAFF'
        ? {
            staffAssignments: { some: { userId: user.userId } },
          }
        : {};

      const cohorts = await prisma.cohort.findMany({
        where: whereClause,
        include: {
          assignments: true,
          sessions: {
            where: {
              date: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      });

      cohorts.forEach((cohort) => {
        // Cohort dates
        if (cohort.startDate) {
          events.push({
            id: `cohort-start-${cohort.id}`,
            title: `${cohort.name} Starts`,
            start: cohort.startDate,
            allDay: true,
            type: 'cohort',
            color: '#2563eb',
          });
        }
        if (cohort.endDate) {
          events.push({
            id: `cohort-end-${cohort.id}`,
            title: `${cohort.name} Ends`,
            start: cohort.endDate,
            allDay: true,
            type: 'cohort',
            color: '#dc2626',
          });
        }

        // Assignments
        cohort.assignments.forEach((assignment) => {
          if (assignment.dueDate) {
            events.push({
              id: `assignment-${assignment.id}`,
              title: `Due: ${assignment.title}`,
              start: assignment.dueDate,
              allDay: true,
              type: 'assignment',
              color: '#f59e0b',
              url: `/staff/assignments/${assignment.id}`,
              extendedProps: {
                cohortName: cohort.name,
                assignmentId: assignment.id,
                maxPoints: assignment.maxPoints,
              },
            });
          }
        });

        // Sessions
        cohort.sessions.forEach((session) => {
          events.push({
            id: `session-${session.id}`,
            title: session.title || `Session: ${cohort.name}`,
            start: session.date,
            allDay: true,
            type: 'session',
            color: '#8b5cf6',
            url: `/staff/attendance?session=${session.id}`,
            extendedProps: {
              cohortName: cohort.name,
              sessionId: session.id,
            },
          });
        });
      });
    }

    // Filter by date range
    const filteredEvents = events.filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate >= start && eventDate <= end;
    });

    return NextResponse.json({ events: filteredEvents });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}
