import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth';

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

// GET /api/bulk/export-attendance - Export attendance records as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user) && !isStaff(user)) {
      return NextResponse.json({ error: 'Staff or admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cohortId = searchParams.get('cohortId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // RLS: Get accessible cohorts for staff
    const accessibleCohortIds = await getAccessibleCohortIds(user.userId, user.role);

    // Staff with no cohort assignments can't export
    if (accessibleCohortIds !== null && accessibleCohortIds.length === 0) {
      return NextResponse.json({
        error: 'No cohorts assigned. Contact admin to be assigned to a cohort.'
      }, { status: 403 });
    }

    // Verify staff has access to requested cohort
    if (cohortId && accessibleCohortIds !== null && !accessibleCohortIds.includes(cohortId)) {
      return NextResponse.json({ error: 'Not authorized to access this cohort' }, { status: 403 });
    }

    // Build where clause with RLS
    const where: Record<string, unknown> = {};
    if (cohortId) {
      where.session = { cohortId };
    } else if (accessibleCohortIds !== null) {
      // Staff can only see data from assigned cohorts
      where.session = { cohortId: { in: accessibleCohortIds } };
    }

    // Date range filter
    if (startDate || endDate) {
      where.session = {
        ...((where.session as object) || {}),
        date: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      };
    }

    // Get all attendance records
    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
        session: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            mode: true,
            status: true,
            cohort: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { session: { cohort: { name: 'asc' } } },
        { session: { date: 'desc' } },
        { user: { username: 'asc' } },
      ],
    });

    // Generate CSV
    const headers = [
      'Cohort',
      'Session Title',
      'Session Date',
      'Start Time',
      'End Time',
      'Session Mode',
      'Session Status',
      'Student Email',
      'Student Username',
      'Student Name',
      'Attendance Status',
      'Check In',
      'Check Out',
      'Notes',
      'Recorded At',
    ];

    const rows = attendance.map((a) => [
      a.session.cohort.name,
      a.session.title || 'Untitled Session',
      a.session.date
        ? new Date(a.session.date).toISOString().split('T')[0]
        : '',
      a.session.startTime || '',
      a.session.endTime || '',
      a.session.mode || '',
      a.session.status || '',
      a.user.email,
      a.user.username,
      a.user.displayName || '',
      a.status,
      a.checkInAt
        ? new Date(a.checkInAt).toISOString().replace('T', ' ').split('.')[0]
        : '',
      a.checkOutAt
        ? new Date(a.checkOutAt).toISOString().replace('T', ' ').split('.')[0]
        : '',
      a.notes || '',
      a.createdAt
        ? new Date(a.createdAt).toISOString().split('T')[0]
        : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape cells containing commas, quotes, or newlines
            const cellStr = String(cell);
            if (
              cellStr.includes(',') ||
              cellStr.includes('"') ||
              cellStr.includes('\n')
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      ),
    ].join('\n');

    // Return CSV file
    const filename = cohortId
      ? `attendance-cohort-${cohortId}-${new Date().toISOString().split('T')[0]}.csv`
      : `all-attendance-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting attendance:', error);
    return NextResponse.json({ error: 'Failed to export attendance' }, { status: 500 });
  }
}

// Also create a summary export endpoint
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmin(user) && !isStaff(user)) {
      return NextResponse.json({ error: 'Staff or admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { cohortId, format = 'detailed' } = body;

    // RLS: Get accessible cohorts for staff
    const accessibleCohortIds = await getAccessibleCohortIds(user.userId, user.role);

    // Staff with no cohort assignments can't export
    if (accessibleCohortIds !== null && accessibleCohortIds.length === 0) {
      return NextResponse.json({
        error: 'No cohorts assigned. Contact admin to be assigned to a cohort.'
      }, { status: 403 });
    }

    // Verify staff has access to requested cohort
    if (cohortId && accessibleCohortIds !== null && !accessibleCohortIds.includes(cohortId)) {
      return NextResponse.json({ error: 'Not authorized to access this cohort' }, { status: 403 });
    }

    if (format === 'summary') {
      // Get attendance summary per student
      const where: Record<string, unknown> = {};
      if (cohortId) {
        where.session = { cohortId };
      } else if (accessibleCohortIds !== null) {
        // Staff can only see data from assigned cohorts
        where.session = { cohortId: { in: accessibleCohortIds } };
      }

      const attendanceRecords = await prisma.attendance.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
            },
          },
          session: {
            select: {
              cohort: {
                select: { name: true },
              },
            },
          },
        },
      });

      // Group by student
      const summaryMap = new Map<
        string,
        {
          user: { email: string; username: string; displayName: string | null };
          cohort: string;
          present: number;
          absent: number;
          late: number;
          excused: number;
          total: number;
        }
      >();

      attendanceRecords.forEach((a) => {
        const key = `${a.user.id}-${a.session.cohort.name}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            user: {
              email: a.user.email,
              username: a.user.username,
              displayName: a.user.displayName,
            },
            cohort: a.session.cohort.name,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0,
          });
        }

        const summary = summaryMap.get(key)!;
        summary.total++;
        switch (a.status) {
          case 'PRESENT':
            summary.present++;
            break;
          case 'ABSENT':
            summary.absent++;
            break;
          case 'LATE':
            summary.late++;
            break;
          case 'EXCUSED':
            summary.excused++;
            break;
        }
      });

      const headers = [
        'Cohort',
        'Student Email',
        'Student Username',
        'Student Name',
        'Total Sessions',
        'Present',
        'Absent',
        'Late',
        'Excused',
        'Attendance Rate',
      ];

      const rows = Array.from(summaryMap.values()).map((s) => {
        const attendanceRate =
          s.total > 0
            ? Math.round(((s.present + s.late) / s.total) * 100)
            : 0;
        return [
          s.cohort,
          s.user.email,
          s.user.username,
          s.user.displayName || '',
          s.total,
          s.present,
          s.absent,
          s.late,
          s.excused,
          `${attendanceRate}%`,
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => String(cell)).join(',')),
      ].join('\n');

      const filename = cohortId
        ? `attendance-summary-cohort-${cohortId}-${new Date().toISOString().split('T')[0]}.csv`
        : `attendance-summary-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting attendance summary:', error);
    return NextResponse.json(
      { error: 'Failed to export attendance summary' },
      { status: 500 }
    );
  }
}
