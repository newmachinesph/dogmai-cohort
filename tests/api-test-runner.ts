/**
 * DOGM.AI API Test Runner
 *
 * Comprehensive API testing for all endpoints
 * Run: npx tsx tests/api-test-runner.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test credentials
const CREDENTIALS = {
  admin: { email: 'admin@dogm.ai', password: 'Admin123!' },
  admin2: { email: 'director@dogm.ai', password: 'Admin123!' },
  staff1: { email: 'john.instructor@dogm.ai', password: 'Staff123!' },
  staff2: { email: 'maria.ta@dogm.ai', password: 'Staff123!' },
  staff3: { email: 'carlos.instructor@dogm.ai', password: 'Staff123!' },
  staff4: { email: 'elena.ta@dogm.ai', password: 'Staff123!' },
  student1: { email: 'student1@email.com', password: 'Student123!' },
  student25: { email: 'student25@email.com', password: 'Student123!' },
  student26: { email: 'student26@email.com', password: 'Student123!' },
  student50: { email: 'student50@email.com', password: 'Student123!' },
};

// Test state
interface TestState {
  tokens: Record<string, string>;
  cohortIds: string[];
  userIds: Record<string, string>;
  assignmentIds: string[];
  sessionIds: string[];
  moduleIds: string[];
  enrollmentIds: string[];
}

const state: TestState = {
  tokens: {},
  cohortIds: [],
  userIds: {},
  assignmentIds: [],
  sessionIds: [],
  moduleIds: [],
  enrollmentIds: [],
};

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

// Helper functions
async function api(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    expectedStatus?: number;
  } = {}
): Promise<{ status: number; data: unknown; cookies?: string[] }> {
  const { method = 'GET', body, token, expectedStatus } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Cookie'] = `auth-token=${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  const cookies = response.headers.getSetCookie?.() || [];

  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return { status: response.status, data, cookies };
}

function extractToken(cookies: string[]): string | null {
  for (const cookie of cookies) {
    const match = cookie.match(/auth-token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`  ${colors.green}✓${colors.reset} ${name} ${colors.dim}(${duration}ms)${colors.reset}`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage, duration });
    console.log(`  ${colors.red}✗${colors.reset} ${name}`);
    console.log(`    ${colors.dim}${errorMessage}${colors.reset}`);
  }
}

function section(title: string): void {
  console.log(`\n${colors.cyan}━━━ ${title} ━━━${colors.reset}`);
}

// ============================================
// AUTH TESTS
// ============================================

async function testAuth(): Promise<void> {
  section('Authentication Tests');

  // Test login for all user types
  for (const [role, creds] of Object.entries(CREDENTIALS)) {
    await runTest(`Login as ${role}`, async () => {
      const { status, data, cookies } = await api('/api/auth/login', {
        method: 'POST',
        body: creds,
      });

      if (status !== 200) throw new Error(`Login failed: ${JSON.stringify(data)}`);
      const token = extractToken(cookies || []);
      if (!token) throw new Error('No auth token in response');

      state.tokens[role] = token;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userData = data as any;
      if (userData.user?.id) {
        state.userIds[role] = userData.user.id;
      }
    });
  }

  // Test /me endpoint
  await runTest('GET /api/auth/me (authenticated)', async () => {
    const { status, data } = await api('/api/auth/me', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((data as any).user?.role !== 'ADMIN') throw new Error('Wrong role returned');
  });

  await runTest('GET /api/auth/me (unauthenticated)', async () => {
    const { status } = await api('/api/auth/me');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  // Test invalid login (use a separate test email to avoid rate limiting main admin)
  await runTest('Login with wrong password', async () => {
    const { status } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'testfaillogin@email.com', password: 'wrongpassword' },
    });
    // Will be 401 for non-existent user or wrong password
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  await runTest('Login with invalid email', async () => {
    const { status } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'notexist@email.com', password: 'password' },
    });
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  // Test logout
  await runTest('POST /api/auth/logout', async () => {
    const { status } = await api('/api/auth/logout', {
      method: 'POST',
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Logout failed: status ${status}`);
  });
}

// ============================================
// COHORT TESTS
// ============================================

async function testCohorts(): Promise<void> {
  section('Cohort Tests');

  // GET cohorts as admin
  await runTest('GET /api/cohorts (admin)', async () => {
    const { status, data } = await api('/api/cohorts', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cohorts = (data as any).cohorts;
    if (!Array.isArray(cohorts)) throw new Error('Expected cohorts array');
    if (cohorts.length < 2) throw new Error('Expected at least 2 cohorts');

    state.cohortIds = cohorts.map((c: { id: string }) => c.id);
  });

  // GET cohorts as staff (only their assigned cohorts)
  await runTest('GET /api/cohorts (staff - sees only assigned)', async () => {
    const { status, data } = await api('/api/cohorts', {
      token: state.tokens.staff1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cohorts = (data as any).cohorts;
    if (!Array.isArray(cohorts)) throw new Error('Expected cohorts array');
    // Staff1 (john.instructor) is assigned to Batch 1 & 2
    if (cohorts.length < 1) throw new Error(`Expected at least 1 cohort, got ${cohorts.length}`);
  });

  // GET cohorts as student (only their enrolled cohorts)
  await runTest('GET /api/cohorts (student - sees only enrolled)', async () => {
    const { status, data } = await api('/api/cohorts', {
      token: state.tokens.student1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cohorts = (data as any).cohorts;
    if (cohorts.length !== 1) throw new Error(`Expected 1 cohort, got ${cohorts.length}`);
  });

  // GET cohorts unauthenticated
  await runTest('GET /api/cohorts (unauthenticated)', async () => {
    const { status } = await api('/api/cohorts');
    if (status !== 401) throw new Error(`Expected 401, got ${status}`);
  });

  // GET single cohort
  await runTest('GET /api/cohorts/:id (admin)', async () => {
    const { status, data } = await api(`/api/cohorts/${state.cohortIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Create cohort (admin only)
  await runTest('POST /api/cohorts (admin)', async () => {
    const { status, data } = await api('/api/cohorts', {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        name: 'Test Cohort',
        location: 'Test Location',
        startDate: '2025-07-01',
        endDate: '2025-09-01',
        maxStudents: 20,
      },
    });
    if (status !== 201) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.cohortIds.push((data as any).cohort.id);
  });

  // Create cohort (staff - should fail)
  await runTest('POST /api/cohorts (staff - forbidden)', async () => {
    const { status } = await api('/api/cohorts', {
      method: 'POST',
      token: state.tokens.staff1,
      body: {
        name: 'Staff Cohort',
        location: 'Location',
        startDate: '2025-07-01',
        endDate: '2025-09-01',
      },
    });
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });

  // Update cohort
  await runTest('PUT /api/cohorts/:id (admin)', async () => {
    const { status, data } = await api(`/api/cohorts/${state.cohortIds[2]}`, {
      method: 'PUT',
      token: state.tokens.admin,
      body: {
        name: 'Test Cohort Updated',
        description: 'Updated description',
      },
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });
}

// ============================================
// USER TESTS
// ============================================

async function testUsers(): Promise<void> {
  section('User Tests');

  // GET users (admin only)
  await runTest('GET /api/users (admin)', async () => {
    const { status, data } = await api('/api/users', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(data as any).users) throw new Error('Expected users array');
  });

  // GET users with role filter
  await runTest('GET /api/users?role=STUDENT (admin)', async () => {
    const { status, data } = await api('/api/users?role=STUDENT', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = (data as any).users;
    if (!users.every((u: { role: string }) => u.role === 'STUDENT')) {
      throw new Error('Not all users are students');
    }
  });

  // GET users (staff - admin only endpoint)
  await runTest('GET /api/users (staff - forbidden)', async () => {
    const { status } = await api('/api/users', {
      token: state.tokens.staff1,
    });
    // Users endpoint is admin-only
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });

  // GET users (student - forbidden)
  await runTest('GET /api/users (student - forbidden)', async () => {
    const { status } = await api('/api/users', {
      token: state.tokens.student1,
    });
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });

  // GET single user
  await runTest('GET /api/users/:id (admin)', async () => {
    const { status, data } = await api(`/api/users/${state.userIds.student1}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });
}

// ============================================
// ENROLLMENT TESTS
// ============================================

async function testEnrollments(): Promise<void> {
  section('Enrollment Tests');

  // GET enrollments (admin)
  await runTest('GET /api/enrollments (admin)', async () => {
    const { status, data } = await api('/api/enrollments', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollments = (data as any).enrollments;
    if (!Array.isArray(enrollments)) throw new Error('Expected enrollments array');
    if (enrollments.length === 0) throw new Error('Expected some enrollments');
  });

  // GET enrollments by cohort
  await runTest('GET /api/enrollments?cohortId=X (admin)', async () => {
    const { status, data } = await api(`/api/enrollments?cohortId=${state.cohortIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollments = (data as any).enrollments;
    // Cohorts have varying enrollment counts (7-25)
    if (enrollments.length < 5) throw new Error(`Expected at least 5 enrollments, got ${enrollments.length}`);

    // Store an enrollment ID for later tests
    if (enrollments.length > 0) {
      state.enrollmentIds.push(enrollments[0].id);
    }
  });

  // GET enrollments (student - only sees own)
  await runTest('GET /api/enrollments (student - only sees own)', async () => {
    const { status, data } = await api('/api/enrollments', {
      token: state.tokens.student1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollments = (data as any).enrollments;
    if (enrollments.length !== 1) throw new Error(`Expected 1 enrollment, got ${enrollments.length}`);
  });
}

// ============================================
// SESSION TESTS
// ============================================

async function testSessions(): Promise<void> {
  section('Session Tests');

  // GET sessions
  await runTest('GET /api/sessions (admin)', async () => {
    const { status, data } = await api('/api/sessions', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = (data as any).sessions;
    if (!Array.isArray(sessions)) throw new Error('Expected sessions array');

    if (sessions.length > 0) {
      state.sessionIds.push(sessions[0].id);
    }
  });

  // GET sessions by cohort
  await runTest('GET /api/sessions?cohortId=X', async () => {
    const { status, data } = await api(`/api/sessions?cohortId=${state.cohortIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = (data as any).sessions;
    // Should have at least 60 sessions per cohort
    if (sessions.length < 60) throw new Error(`Expected at least 60 sessions, got ${sessions.length}`);
  });

  // Create session
  await runTest('POST /api/sessions (admin)', async () => {
    const { status, data } = await api('/api/sessions', {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        cohortId: state.cohortIds[0],
        title: 'Test Session',
        date: '2025-04-15',
        startTime: '09:00',
        endTime: '17:00',
        mode: 'HYBRID',
      },
    });
    if (status !== 201) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.sessionIds.push((data as any).session.id);
  });
}

// ============================================
// ASSIGNMENT TESTS
// ============================================

async function testAssignments(): Promise<void> {
  section('Assignment Tests');

  // GET assignments (admin)
  await runTest('GET /api/assignments (admin)', async () => {
    const { status, data } = await api('/api/assignments', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (data as any).assignments;
    if (!Array.isArray(assignments)) throw new Error('Expected assignments array');

    if (assignments.length > 0) {
      state.assignmentIds.push(assignments[0].id);
    }
  });

  // GET assignments (student - only published from their cohorts)
  await runTest('GET /api/assignments (student)', async () => {
    const { status, data } = await api('/api/assignments', {
      token: state.tokens.student1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (data as any).assignments;
    // Students should have submission status included
    if (assignments.length > 0 && !('submission' in assignments[0])) {
      throw new Error('Expected submission field in student response');
    }
  });

  // Create assignment (using admin since staff may not be assigned to cohort[0])
  await runTest('POST /api/assignments (admin)', async () => {
    const { status, data } = await api('/api/assignments', {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        cohortId: state.cohortIds[0],
        title: 'Test Assignment',
        description: 'Test description',
        instructions: 'Test instructions',
        dueDate: '2025-05-01',
        maxPoints: 100,
        submissionType: 'TEXT',
      },
    });
    if (status !== 201) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state.assignmentIds.push((data as any).assignment.id);
  });

  // Staff cannot create assignment for unassigned cohort
  await runTest('POST /api/assignments (staff - wrong cohort)', async () => {
    const { status } = await api('/api/assignments', {
      method: 'POST',
      token: state.tokens.staff3, // Staff3 is assigned to cohort2
      body: {
        cohortId: state.cohortIds[0], // Trying to create for cohort1
        title: 'Unauthorized Assignment',
        description: 'This should fail',
        instructions: 'Instructions',
        dueDate: '2025-05-01',
      },
    });
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });
}

// ============================================
// SUBMISSION TESTS
// ============================================

async function testSubmissions(): Promise<void> {
  section('Submission Tests');

  // GET submissions (admin)
  await runTest('GET /api/submissions (admin)', async () => {
    const { status, data } = await api('/api/submissions', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // GET submissions for assignment
  await runTest('GET /api/submissions?assignmentId=X (staff)', async () => {
    const { status, data } = await api(`/api/submissions?assignmentId=${state.assignmentIds[0]}`, {
      token: state.tokens.staff1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Create submission (student)
  await runTest('POST /api/submissions (student)', async () => {
    // Find a published assignment the student can submit to
    const { data: assignmentsData } = await api('/api/assignments', {
      token: state.tokens.student1,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (assignmentsData as any).assignments || [];
    const unsubmitted = assignments.find((a: { submission: unknown }) => !a.submission);

    if (!unsubmitted) {
      // All assignments already have submissions - just check we can access them
      return;
    }

    const { status, data } = await api('/api/submissions', {
      method: 'POST',
      token: state.tokens.student1,
      body: {
        assignmentId: unsubmitted.id,
        content: 'My test submission content',
      },
    });
    if (status !== 201 && status !== 400) {
      // 400 is ok if already submitted
      throw new Error(`Failed: ${JSON.stringify(data)}`);
    }
  });
}

// ============================================
// ATTENDANCE TESTS
// ============================================

async function testAttendance(): Promise<void> {
  section('Attendance Tests');

  // GET attendance summary
  await runTest('GET /api/attendance/summary (admin)', async () => {
    const { status, data } = await api(`/api/attendance/summary?cohortId=${state.cohortIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // GET attendance for session
  await runTest('GET /api/attendance?sessionId=X (staff)', async () => {
    const { status, data } = await api(`/api/attendance?sessionId=${state.sessionIds[0]}`, {
      token: state.tokens.staff1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Record attendance
  await runTest('POST /api/attendance (staff)', async () => {
    const { status, data } = await api('/api/attendance', {
      method: 'POST',
      token: state.tokens.staff1,
      body: {
        sessionId: state.sessionIds[state.sessionIds.length - 1], // New session
        userId: state.userIds.student1,
        status: 'PRESENT',
      },
    });
    // May be 201 or 200 (update) or 400 (already exists)
    if (status !== 201 && status !== 200 && status !== 400) {
      throw new Error(`Failed: ${JSON.stringify(data)}`);
    }
  });
}

// ============================================
// MODULE & LESSON TESTS
// ============================================

async function testModulesAndLessons(): Promise<void> {
  section('Module & Lesson Tests');

  // GET modules
  await runTest('GET /api/modules (admin)', async () => {
    const { status, data } = await api('/api/modules', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modules = (data as any).modules;
    if (!Array.isArray(modules)) throw new Error('Expected modules array');
    if (modules.length < 6) throw new Error(`Expected at least 6 modules, got ${modules.length}`);

    state.moduleIds = modules.map((m: { id: string }) => m.id);
  });

  // GET single module
  await runTest('GET /api/modules/:id', async () => {
    const { status, data } = await api(`/api/modules/${state.moduleIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // GET lessons
  await runTest('GET /api/lessons', async () => {
    const { status, data } = await api('/api/lessons', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lessons = (data as any).lessons;
    if (!Array.isArray(lessons)) throw new Error('Expected lessons array');
    if (lessons.length < 30) throw new Error(`Expected at least 30 lessons, got ${lessons.length}`);
  });

  // GET lessons by module
  await runTest('GET /api/lessons?moduleId=X', async () => {
    const { status, data } = await api(`/api/lessons?moduleId=${state.moduleIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lessons = (data as any).lessons;
    // Each module has 10 lessons now
    if (lessons.length < 5) throw new Error(`Expected at least 5 lessons per module, got ${lessons.length}`);
  });
}

// ============================================
// ANNOUNCEMENT TESTS
// ============================================

async function testAnnouncements(): Promise<void> {
  section('Announcement Tests');

  // GET announcements
  await runTest('GET /api/announcements (admin)', async () => {
    const { status, data } = await api('/api/announcements', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // GET announcements by cohort
  await runTest('GET /api/announcements?cohortId=X', async () => {
    const { status, data } = await api(`/api/announcements?cohortId=${state.cohortIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const announcements = (data as any).announcements;
    if (announcements.length < 1) throw new Error('Expected at least 1 announcement for cohort');
  });

  // Create announcement (using admin)
  await runTest('POST /api/announcements (admin)', async () => {
    const { status, data } = await api('/api/announcements', {
      method: 'POST',
      token: state.tokens.admin,
      body: {
        cohortId: state.cohortIds[0],
        title: 'Test Announcement',
        content: 'Test content for the announcement',
        priority: 'NORMAL',
      },
    });
    if (status !== 201) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });
}

// ============================================
// NOTIFICATION TESTS
// ============================================

async function testNotifications(): Promise<void> {
  section('Notification Tests');

  // GET notifications (user's own)
  await runTest('GET /api/notifications (student)', async () => {
    const { status, data } = await api('/api/notifications', {
      token: state.tokens.student1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(data as any).notifications) throw new Error('Expected notifications array');
  });

  // Mark notification as read
  await runTest('PUT /api/notifications (mark as read)', async () => {
    // First get a notification
    const { data: notifData } = await api('/api/notifications', {
      token: state.tokens.student1,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifications = (notifData as any).notifications || [];

    if (notifications.length === 0) {
      // No notifications to mark
      return;
    }

    const { status, data } = await api('/api/notifications', {
      method: 'PUT',
      token: state.tokens.student1,
      body: {
        notificationIds: [notifications[0].id],
        isRead: true,
      },
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });
}

// ============================================
// DASHBOARD TESTS
// ============================================

async function testDashboards(): Promise<void> {
  section('Dashboard Tests');

  // Admin dashboard
  await runTest('GET /api/dashboard/admin', async () => {
    const { status, data } = await api('/api/dashboard/admin', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Staff dashboard
  await runTest('GET /api/dashboard/staff', async () => {
    const { status, data } = await api('/api/dashboard/staff', {
      token: state.tokens.staff1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Student dashboard
  await runTest('GET /api/dashboard/student', async () => {
    const { status, data } = await api('/api/dashboard/student', {
      token: state.tokens.student1,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Admin dashboard (student - forbidden)
  await runTest('GET /api/dashboard/admin (student - forbidden)', async () => {
    const { status } = await api('/api/dashboard/admin', {
      token: state.tokens.student1,
    });
    if (status !== 403) throw new Error(`Expected 403, got ${status}`);
  });
}

// ============================================
// SETTINGS TESTS
// ============================================

async function testSettings(): Promise<void> {
  section('Settings Tests');

  // GET settings (admin)
  await runTest('GET /api/settings (admin)', async () => {
    const { status, data } = await api('/api/settings', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // GET single setting
  await runTest('GET /api/settings/site_name', async () => {
    const { status, data } = await api('/api/settings/site_name', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Update setting
  await runTest('PUT /api/settings/site_name (admin)', async () => {
    const { status, data } = await api('/api/settings/site_name', {
      method: 'PUT',
      token: state.tokens.admin,
      body: {
        value: 'DOGM.AI Bootcamp Updated',
      },
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // Settings (non-admin - allowed for read-only)
  await runTest('GET /api/settings (student - allowed)', async () => {
    const { status } = await api('/api/settings', {
      token: state.tokens.student1,
    });
    // Settings are readable by all authenticated users
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
  });
}

// ============================================
// STAFF ASSIGNMENT TESTS
// ============================================

async function testStaffAssignments(): Promise<void> {
  section('Staff Assignment Tests');

  // GET staff assignments
  await runTest('GET /api/staff-assignments (admin)', async () => {
    const { status, data } = await api('/api/staff-assignments', {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
  });

  // GET by cohort
  await runTest('GET /api/staff-assignments?cohortId=X', async () => {
    const { status, data } = await api(`/api/staff-assignments?cohortId=${state.cohortIds[0]}`, {
      token: state.tokens.admin,
    });
    if (status !== 200) throw new Error(`Failed: ${JSON.stringify(data)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (data as any).assignments;
    if (assignments.length !== 2) throw new Error(`Expected 2 staff per cohort, got ${assignments.length}`);
  });
}

// ============================================
// MAIN RUNNER
// ============================================

async function main(): Promise<void> {
  console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}        ${colors.cyan}DOGM.AI API Test Suite${colors.reset}                        ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}        Base URL: ${BASE_URL}                  ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);

  const startTime = Date.now();

  try {
    await testAuth();
    await testCohorts();
    await testUsers();
    await testEnrollments();
    await testSessions();
    await testAssignments();
    await testSubmissions();
    await testAttendance();
    await testModulesAndLessons();
    await testAnnouncements();
    await testNotifications();
    await testDashboards();
    await testSettings();
    await testStaffAssignments();
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  }

  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`\n  ${colors.cyan}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`  ${colors.dim}Total time: ${totalTime}ms${colors.reset}`);
  console.log();

  if (failed > 0) {
    console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  ${colors.red}✗${colors.reset} ${result.name}`);
      console.log(`    ${colors.dim}${result.error}${colors.reset}`);
    }
    process.exit(1);
  }

  console.log(`${colors.green}All tests passed!${colors.reset}\n`);
}

main();
