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

// GET /api/bulk/export-grades - Export grades as CSV
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

    // Build where clause with RLS
    const where: Record<string, unknown> = {};
    if (cohortId) {
      where.assignment = { cohortId };
    } else if (accessibleCohortIds !== null) {
      // Staff can only see data from assigned cohorts
      where.assignment = { cohortId: { in: accessibleCohortIds } };
    }

    // Get all submissions with grades
    const submissions = await prisma.submission.findMany({
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
        assignment: {
          select: {
            id: true,
            title: true,
            maxPoints: true,
            passingScore: true,
            dueDate: true,
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
        { assignment: { cohort: { name: 'asc' } } },
        { assignment: { title: 'asc' } },
        { user: { username: 'asc' } },
      ],
    });

    // Get grader info separately
    const graderIds = [...new Set(
      submissions
        .filter((s) => s.gradedById)
        .map((s) => s.gradedById as string)
    )];

    const graders = graderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: graderIds } },
          select: { id: true, displayName: true, username: true },
        })
      : [];

    const graderMap = new Map(graders.map((g) => [g.id, g]));

    // Generate CSV
    const headers = [
      'Cohort',
      'Assignment',
      'Student Email',
      'Student Username',
      'Student Name',
      'Status',
      'Score',
      'Max Points',
      'Percentage',
      'Passing Score',
      'Passed',
      'Due Date',
      'Submitted At',
      'Graded At',
      'Graded By',
      'Feedback',
    ];

    const rows = submissions.map((s) => {
      const percentage =
        s.score !== null && s.assignment.maxPoints
          ? Math.round((s.score / s.assignment.maxPoints) * 100)
          : null;
      const passed =
        s.score !== null && s.assignment.passingScore !== null
          ? s.score >= s.assignment.passingScore
            ? 'Yes'
            : 'No'
          : 'N/A';

      const grader = s.gradedById ? graderMap.get(s.gradedById) : null;

      return [
        s.assignment.cohort.name,
        s.assignment.title,
        s.user.email,
        s.user.username,
        s.user.displayName || '',
        s.status,
        s.score !== null ? s.score : '',
        s.assignment.maxPoints || '',
        percentage !== null ? `${percentage}%` : '',
        s.assignment.passingScore || '',
        passed,
        s.assignment.dueDate
          ? new Date(s.assignment.dueDate).toISOString().split('T')[0]
          : '',
        s.submittedAt
          ? new Date(s.submittedAt).toISOString().split('T')[0]
          : '',
        s.gradedAt ? new Date(s.gradedAt).toISOString().split('T')[0] : '',
        grader?.displayName || grader?.username || '',
        s.feedback || '',
      ];
    });

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
      ? `grades-cohort-${cohortId}-${new Date().toISOString().split('T')[0]}.csv`
      : `all-grades-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting grades:', error);
    return NextResponse.json({ error: 'Failed to export grades' }, { status: 500 });
  }
}
