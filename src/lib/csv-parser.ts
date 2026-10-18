// Simple CSV parser for bulk operations

export interface ParsedCSV<T = Record<string, string>> {
  headers: string[];
  rows: T[];
  errors: { row: number; message: string }[];
}

export function parseCSV<T = Record<string, string>>(
  csvContent: string,
  options?: {
    requiredHeaders?: string[];
    headerMap?: Record<string, string>;
  }
): ParsedCSV<T> {
  const lines = csvContent.trim().split(/\r?\n/);
  const errors: { row: number; message: string }[] = [];

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'Empty file' }] };
  }

  // Parse header row
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().toLowerCase());

  // Check required headers
  if (options?.requiredHeaders) {
    const missingHeaders = options.requiredHeaders.filter(
      h => !headers.includes(h.toLowerCase())
    );
    if (missingHeaders.length > 0) {
      errors.push({
        row: 1,
        message: `Missing required headers: ${missingHeaders.join(', ')}`,
      });
    }
  }

  // Parse data rows
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        message: `Expected ${headers.length} columns but got ${values.length}`,
      });
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = options?.headerMap?.[header] || header;
      row[key] = values[index]?.trim() || '';
    });

    rows.push(row as T);
  }

  return { headers: rawHeaders, rows, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

export function generateCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const headerRow = keys.map(escapeCSVValue).join(',');

  const dataRows = data.map(row =>
    keys.map(key => escapeCSVValue(String(row[key] ?? ''))).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Template generators
export function generateStudentImportTemplate(): string {
  return generateCSV([
    {
      email: 'student@example.com',
      username: 'student1',
      display_name: 'John Doe',
      password: 'TempPassword123',
    },
  ], ['email', 'username', 'display_name', 'password']);
}

export function generateGradeImportTemplate(): string {
  return generateCSV([
    {
      student_email: 'student@example.com',
      assignment_id: 'assignment-uuid-here',
      grade: '85',
      feedback: 'Good work!',
    },
  ], ['student_email', 'assignment_id', 'grade', 'feedback']);
}

export function generateEnrollmentImportTemplate(): string {
  return generateCSV([
    {
      email: 'student@example.com',
      cohort_id: 'cohort-uuid-here',
    },
  ], ['email', 'cohort_id']);
}
