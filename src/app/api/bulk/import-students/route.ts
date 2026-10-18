import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest, hashPassword } from '@/lib/auth';
import { parseCSV } from '@/lib/csv-parser';
import { sendWelcomeEmail } from '@/lib/email-service';

interface StudentRow {
  email: string;
  username: string;
  display_name?: string;
  password?: string;
}

// POST /api/bulk/import-students - Import students from CSV
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const cohortId = formData.get('cohortId') as string;
    const sendWelcomeEmails = formData.get('sendWelcomeEmails') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const csvContent = await file.text();
    const parsed = parseCSV<StudentRow>(csvContent, {
      requiredHeaders: ['email', 'username'],
      headerMap: {
        'display_name': 'display_name',
        'displayname': 'display_name',
      },
    });

    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return NextResponse.json({
        error: 'Failed to parse CSV',
        details: parsed.errors,
      }, { status: 400 });
    }

    const results = {
      created: 0,
      skipped: 0,
      enrolled: 0,
      errors: [] as { row: number; email: string; message: string }[],
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: row.email.toLowerCase() },
              { username: row.username.toLowerCase() },
            ],
          },
        });

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          results.skipped++;
        } else {
          // Generate password if not provided
          const tempPassword = row.password || generateTempPassword();
          const hashedPassword = await hashPassword(tempPassword);

          // Create user with mustChangePassword flag
          const newUser = await prisma.user.create({
            data: {
              email: row.email.toLowerCase(),
              username: row.username.toLowerCase(),
              displayName: row.display_name || row.username,
              passwordHash: hashedPassword,
              role: 'STUDENT',
              mustChangePassword: !row.password, // Require change if using generated password
            },
          });

          userId = newUser.id;
          results.created++;

          // Send welcome email if enabled
          if (sendWelcomeEmails) {
            try {
              await sendWelcomeEmail({
                to: row.email,
                userName: row.display_name || row.username,
                userEmail: row.email,
                role: 'STUDENT',
                loginUrl: `${baseUrl}/login`,
                temporaryPassword: tempPassword,
              });
            } catch (emailError) {
              console.error('Failed to send welcome email:', emailError);
            }
          }
        }

        // Enroll in cohort if specified
        if (cohortId) {
          const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
              userId,
              cohortId,
            },
          });

          if (!existingEnrollment) {
            await prisma.enrollment.create({
              data: {
                userId,
                cohortId,
                status: 'ACTIVE',
              },
            });
            results.enrolled++;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          row: rowNumber,
          email: row.email,
          message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      parseErrors: parsed.errors,
    });
  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json({ error: 'Failed to import students' }, { status: 500 });
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
