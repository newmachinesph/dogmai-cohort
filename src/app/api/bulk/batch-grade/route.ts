import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { parseCSV } from '@/lib/csv-parser';
import { sendGradeNotification } from '@/lib/email-service';

interface GradeRow {
  student_email: string;
  assignment_id: string;
  grade: string;
  feedback?: string;
}

// POST /api/bulk/batch-grade - Batch grade submissions from CSV
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sendNotifications = formData.get('sendNotifications') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvContent = await file.text();
    const parsed = parseCSV<GradeRow>(csvContent, {
      requiredHeaders: ['student_email', 'assignment_id', 'grade'],
    });

    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return NextResponse.json({
        error: 'Failed to parse CSV',
        details: parsed.errors,
      }, { status: 400 });
    }

    const results = {
      graded: 0,
      skipped: 0,
      errors: [] as { row: number; email: string; message: string }[],
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get grader info
    const grader = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { displayName: true, username: true },
    });

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNumber = i + 2;

      try {
        const grade = parseFloat(row.grade);
        if (isNaN(grade)) {
          results.errors.push({
            row: rowNumber,
            email: row.student_email,
            message: `Invalid grade value: ${row.grade}`,
          });
          continue;
        }

        // Find student
        const student = await prisma.user.findFirst({
          where: { email: row.student_email.toLowerCase() },
        });

        if (!student) {
          results.errors.push({
            row: rowNumber,
            email: row.student_email,
            message: 'Student not found',
          });
          continue;
        }

        // Find assignment with cohort info
        const assignment = await prisma.assignment.findUnique({
          where: { id: row.assignment_id },
          include: {
            cohort: true,
            module: true,
          },
        });

        if (!assignment) {
          results.errors.push({
            row: rowNumber,
            email: row.student_email,
            message: `Assignment not found: ${row.assignment_id}`,
          });
          continue;
        }

        // SECURITY: Verify staff has permission to grade in this cohort
        if (user.role !== 'ADMIN') {
          const staffAssignment = await prisma.staffAssignment.findFirst({
            where: {
              userId: user.userId,
              cohortId: assignment.cohortId,
            },
          });

          if (!staffAssignment) {
            results.errors.push({
              row: rowNumber,
              email: row.student_email,
              message: `Not authorized to grade in cohort: ${assignment.cohort.name}`,
            });
            continue;
          }
        }

        // Find student's enrollment
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            userId: student.id,
            cohortId: assignment.cohortId,
          },
        });

        if (!enrollment) {
          results.errors.push({
            row: rowNumber,
            email: row.student_email,
            message: 'Student not enrolled in this cohort',
          });
          continue;
        }

        // Find or create submission
        let submission = await prisma.submission.findFirst({
          where: {
            userId: student.id,
            assignmentId: assignment.id,
          },
        });

        if (!submission) {
          // Create a submission if none exists (for grading without submission)
          submission = await prisma.submission.create({
            data: {
              userId: student.id,
              assignmentId: assignment.id,
              status: 'GRADED',
              score: grade,
              feedback: row.feedback || null,
              gradedById: user.userId,
              gradedAt: new Date(),
            },
          });
        } else {
          // Update existing submission
          await prisma.submission.update({
            where: { id: submission.id },
            data: {
              status: 'GRADED',
              score: grade,
              feedback: row.feedback || submission.feedback,
              gradedById: user.userId,
              gradedAt: new Date(),
            },
          });
        }

        results.graded++;

        // Send notification
        if (sendNotifications) {
          try {
            await sendGradeNotification({
              to: student.email,
              studentName: student.displayName || student.username,
              assignmentTitle: assignment.title,
              lessonTitle: assignment.module?.title || 'Assignment',
              cohortName: assignment.cohort.name,
              grade,
              maxGrade: assignment.maxPoints,
              percentage: Math.round((grade / assignment.maxPoints) * 100),
              feedback: row.feedback,
              gradedBy: grader?.displayName || grader?.username || 'Instructor',
              assignmentUrl: `${baseUrl}/student/assignments/${assignment.id}`,
            });
          } catch (emailError) {
            console.error('Failed to send grade notification:', emailError);
          }
        }
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          email: row.student_email,
          message: error.message || 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      parseErrors: parsed.errors,
    });
  } catch (error) {
    console.error('Error batch grading:', error);
    return NextResponse.json({ error: 'Failed to batch grade' }, { status: 500 });
  }
}
