/**
 * Quick API Test - Tests core functionality
 * Run: npx tsx tests/quick-test.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

async function api(
  method: string,
  endpoint: string,
  options: { body?: unknown; token?: string } = {}
): Promise<{ status: number; data: unknown; token?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers['Cookie'] = `auth-token=${options.token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => null);
  const cookies = res.headers.getSetCookie?.() || [];
  const tokenMatch = cookies.find(c => c.includes('auth-token='))?.match(/auth-token=([^;]+)/);

  return { status: res.status, data, token: tokenMatch?.[1] };
}

function log(result: TestResult): void {
  const icon = result.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${icon} ${result.method} ${result.endpoint} → ${result.status} ${result.message || ''}`);
  results.push(result);
}

async function main(): Promise<void> {
  console.log('\n\x1b[36m═══ DOGM.AI Quick API Test ═══\x1b[0m\n');

  let adminToken = '';
  let staffToken = '';
  let studentToken = '';
  let cohortId = '';
  let assignmentId = '';

  // ===== AUTH =====
  console.log('\x1b[33m▸ Authentication\x1b[0m');

  // Admin login
  let res = await api('POST', '/api/auth/login', {
    body: { email: 'admin@dogm.ai', password: 'Admin123!' }
  });
  adminToken = res.token || '';
  log({ endpoint: '/api/auth/login', method: 'POST', status: res.status, passed: res.status === 200, message: 'Admin' });

  // Staff login
  res = await api('POST', '/api/auth/login', {
    body: { email: 'john.instructor@dogm.ai', password: 'Staff123!' }
  });
  staffToken = res.token || '';
  log({ endpoint: '/api/auth/login', method: 'POST', status: res.status, passed: res.status === 200, message: 'Staff' });

  // Student login
  res = await api('POST', '/api/auth/login', {
    body: { email: 'student1@email.com', password: 'Student123!' }
  });
  studentToken = res.token || '';
  log({ endpoint: '/api/auth/login', method: 'POST', status: res.status, passed: res.status === 200, message: 'Student' });

  // Wrong password
  res = await api('POST', '/api/auth/login', {
    body: { email: 'admin@dogm.ai', password: 'wrong' }
  });
  log({ endpoint: '/api/auth/login', method: 'POST', status: res.status, passed: res.status === 401, message: 'Invalid creds' });

  // Me endpoint
  res = await api('GET', '/api/auth/me', { token: adminToken });
  log({ endpoint: '/api/auth/me', method: 'GET', status: res.status, passed: res.status === 200 });

  // ===== COHORTS =====
  console.log('\n\x1b[33m▸ Cohorts\x1b[0m');

  res = await api('GET', '/api/cohorts', { token: adminToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cohortId = (res.data as any)?.cohorts?.[0]?.id || '';
  log({ endpoint: '/api/cohorts', method: 'GET', status: res.status, passed: res.status === 200 && !!cohortId, message: `Found ${(res.data as { cohorts?: [] })?.cohorts?.length || 0} cohorts` });

  res = await api('GET', `/api/cohorts/${cohortId}`, { token: adminToken });
  log({ endpoint: `/api/cohorts/:id`, method: 'GET', status: res.status, passed: res.status === 200 });

  res = await api('GET', '/api/cohorts', { token: studentToken });
  log({ endpoint: '/api/cohorts', method: 'GET', status: res.status, passed: res.status === 200, message: 'As student' });

  // ===== USERS =====
  console.log('\n\x1b[33m▸ Users\x1b[0m');

  res = await api('GET', '/api/users', { token: adminToken });
  log({ endpoint: '/api/users', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { users?: [] })?.users?.length || 0} users` });

  res = await api('GET', '/api/users?role=STUDENT', { token: adminToken });
  log({ endpoint: '/api/users?role=STUDENT', method: 'GET', status: res.status, passed: res.status === 200 });

  res = await api('GET', '/api/users', { token: studentToken });
  log({ endpoint: '/api/users', method: 'GET', status: res.status, passed: res.status === 403, message: 'Student forbidden' });

  // ===== ENROLLMENTS =====
  console.log('\n\x1b[33m▸ Enrollments\x1b[0m');

  res = await api('GET', '/api/enrollments', { token: adminToken });
  log({ endpoint: '/api/enrollments', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { enrollments?: [] })?.enrollments?.length || 0}` });

  res = await api('GET', `/api/enrollments?cohortId=${cohortId}`, { token: adminToken });
  log({ endpoint: '/api/enrollments?cohortId=:id', method: 'GET', status: res.status, passed: res.status === 200 });

  // ===== SESSIONS =====
  console.log('\n\x1b[33m▸ Sessions\x1b[0m');

  res = await api('GET', '/api/sessions', { token: adminToken });
  log({ endpoint: '/api/sessions', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { sessions?: [] })?.sessions?.length || 0}` });

  // Staff can only access sessions for their assigned cohort
  // John is assigned to cohort1, so we need to get his cohort's sessions
  res = await api('GET', '/api/cohorts', { token: staffToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staffCohortId = (res.data as any)?.cohorts?.[0]?.id || cohortId;
  res = await api('GET', `/api/sessions?cohortId=${staffCohortId}`, { token: staffToken });
  log({ endpoint: '/api/sessions?cohortId=:id', method: 'GET', status: res.status, passed: res.status === 200, message: 'Staff cohort' });

  // ===== ASSIGNMENTS =====
  console.log('\n\x1b[33m▸ Assignments\x1b[0m');

  res = await api('GET', '/api/assignments', { token: adminToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignmentId = (res.data as any)?.assignments?.[0]?.id || '';
  log({ endpoint: '/api/assignments', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { assignments?: [] })?.assignments?.length || 0}` });

  res = await api('GET', '/api/assignments', { token: studentToken });
  log({ endpoint: '/api/assignments', method: 'GET', status: res.status, passed: res.status === 200, message: 'As student' });

  // ===== SUBMISSIONS =====
  console.log('\n\x1b[33m▸ Submissions\x1b[0m');

  res = await api('GET', '/api/submissions', { token: adminToken });
  log({ endpoint: '/api/submissions', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { submissions?: [] })?.submissions?.length || 0}` });

  res = await api('GET', `/api/submissions?assignmentId=${assignmentId}`, { token: staffToken });
  log({ endpoint: '/api/submissions?assignmentId=:id', method: 'GET', status: res.status, passed: res.status === 200 });

  // ===== ATTENDANCE =====
  console.log('\n\x1b[33m▸ Attendance\x1b[0m');

  res = await api('GET', `/api/attendance/summary?cohortId=${cohortId}`, { token: adminToken });
  log({ endpoint: '/api/attendance/summary', method: 'GET', status: res.status, passed: res.status === 200 });

  // ===== MODULES & LESSONS =====
  console.log('\n\x1b[33m▸ Modules & Lessons\x1b[0m');

  res = await api('GET', '/api/modules', { token: adminToken });
  log({ endpoint: '/api/modules', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { modules?: [] })?.modules?.length || 0}` });

  res = await api('GET', '/api/lessons', { token: adminToken });
  log({ endpoint: '/api/lessons', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { lessons?: [] })?.lessons?.length || 0}` });

  // ===== ANNOUNCEMENTS =====
  console.log('\n\x1b[33m▸ Announcements\x1b[0m');

  res = await api('GET', '/api/announcements', { token: adminToken });
  log({ endpoint: '/api/announcements', method: 'GET', status: res.status, passed: res.status === 200, message: `Found ${(res.data as { announcements?: [] })?.announcements?.length || 0}` });

  // ===== NOTIFICATIONS =====
  console.log('\n\x1b[33m▸ Notifications\x1b[0m');

  res = await api('GET', '/api/notifications', { token: studentToken });
  log({ endpoint: '/api/notifications', method: 'GET', status: res.status, passed: res.status === 200 });

  // ===== DASHBOARDS =====
  console.log('\n\x1b[33m▸ Dashboards\x1b[0m');

  res = await api('GET', '/api/dashboard/admin', { token: adminToken });
  log({ endpoint: '/api/dashboard/admin', method: 'GET', status: res.status, passed: res.status === 200 });

  res = await api('GET', '/api/dashboard/staff', { token: staffToken });
  log({ endpoint: '/api/dashboard/staff', method: 'GET', status: res.status, passed: res.status === 200 });

  res = await api('GET', '/api/dashboard/student', { token: studentToken });
  log({ endpoint: '/api/dashboard/student', method: 'GET', status: res.status, passed: res.status === 200 });

  res = await api('GET', '/api/dashboard/admin', { token: studentToken });
  log({ endpoint: '/api/dashboard/admin', method: 'GET', status: res.status, passed: res.status === 403, message: 'Student forbidden' });

  // ===== SETTINGS =====
  console.log('\n\x1b[33m▸ Settings\x1b[0m');

  res = await api('GET', '/api/settings', { token: adminToken });
  log({ endpoint: '/api/settings', method: 'GET', status: res.status, passed: res.status === 200 });

  // Settings read is allowed for authenticated users (non-sensitive settings)
  res = await api('GET', '/api/settings', { token: studentToken });
  log({ endpoint: '/api/settings', method: 'GET', status: res.status, passed: res.status === 200, message: 'Student can read' });

  // But updating settings requires admin
  res = await api('PUT', '/api/settings', { token: studentToken, body: { settings: [] } });
  log({ endpoint: '/api/settings', method: 'PUT', status: res.status, passed: res.status === 403, message: 'Student cannot update' });

  // ===== SUMMARY =====
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n\x1b[36m═══════════════════════════════\x1b[0m');
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m | \x1b[31mFailed: ${failed}\x1b[0m`);
  console.log('\x1b[36m═══════════════════════════════\x1b[0m\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  \x1b[31m✗\x1b[0m ${r.method} ${r.endpoint} → ${r.status}`);
    });
    process.exit(1);
  }
}

main().catch(console.error);
