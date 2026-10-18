import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import {
  generateStudentImportTemplate,
  generateGradeImportTemplate,
  generateEnrollmentImportTemplate,
} from '@/lib/csv-parser';

// GET /api/bulk/templates - Get CSV templates
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let content: string;
    let filename: string;

    switch (type) {
      case 'students':
        content = generateStudentImportTemplate();
        filename = 'student_import_template.csv';
        break;
      case 'grades':
        content = generateGradeImportTemplate();
        filename = 'grade_import_template.csv';
        break;
      case 'enrollments':
        content = generateEnrollmentImportTemplate();
        filename = 'enrollment_import_template.csv';
        break;
      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
