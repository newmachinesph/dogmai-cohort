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

// GET /api/bulk/export-students - Export students as CSV
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

    // Build query based on whether we're filtering by cohort
    let students;

    // Determine which cohorts to query
    const targetCohortIds = cohortId
      ? [cohortId]
      : accessibleCohortIds; // null for admin = all

    if (cohortId || targetCohortIds !== null) {
      // Get students enrolled in specific cohort(s)
      const enrollments = await prisma.enrollment.findMany({
        where: { cohortId: cohortId ? cohortId : { in: targetCohortIds! } },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              role: true,
              isActive: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          cohort: {
            select: {
              name: true,
            },
          },
        },
      });

      students = enrollments.map((e) => ({
        ...e.user,
        cohortName: e.cohort.name,
        enrollmentStatus: e.status,
        enrolledAt: e.enrolledAt,
      }));
    } else {
      // Get all students
      const users = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          enrollments: {
            select: {
              status: true,
              enrolledAt: true,
              cohort: {
                select: { name: true },
              },
            },
          },
        },
      });

      students = users.map((u) => ({
        ...u,
        cohortName: u.enrollments.map((e) => e.cohort.name).join('; ') || 'Not enrolled',
        enrollmentStatus: u.enrollments.map((e) => e.status).join('; ') || 'N/A',
        enrolledAt: u.enrollments[0]?.enrolledAt || null,
      }));
    }

    // Generate CSV
    const headers = [
      'ID',
      'Email',
      'Username',
      'Display Name',
      'Active',
      'Cohort(s)',
      'Enrollment Status',
      'Enrolled At',
      'Created At',
      'Last Login',
    ];

    const rows = students.map((s) => [
      s.id,
      s.email,
      s.username,
      s.displayName || '',
      s.isActive ? 'Yes' : 'No',
      s.cohortName,
      s.enrollmentStatus,
      s.enrolledAt ? new Date(s.enrolledAt).toISOString().split('T')[0] : '',
      new Date(s.createdAt).toISOString().split('T')[0],
      s.lastLoginAt ? new Date(s.lastLoginAt).toISOString().split('T')[0] : 'Never',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape cells containing commas or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    // Return CSV file
    const filename = cohortId
      ? `students-cohort-${cohortId}-${new Date().toISOString().split('T')[0]}.csv`
      : `all-students-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting students:', error);
    return NextResponse.json({ error: 'Failed to export students' }, { status: 500 });
  }
}
