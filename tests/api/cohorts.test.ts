import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma - declare before vi.mock
vi.mock('@/lib/db', () => ({
  prisma: {
    cohort: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    staffAssignment: {
      findMany: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  default: {
    cohort: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    staffAssignment: {
      findMany: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock auth functions - use a global to allow modification
const mockGetUserFromRequestFn = vi.fn();
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    getUserFromRequest: (...args: unknown[]) => mockGetUserFromRequestFn(...args),
    isAdmin: (user: { role: string } | null) => user?.role === 'ADMIN',
    isStaff: (user: { role: string } | null) =>
      user?.role === 'ADMIN' || user?.role === 'INSTRUCTOR' || user?.role === 'MENTOR',
  };
});

import { prisma } from '@/lib/db';
import { GET, POST } from '@/app/api/cohorts/route';

// Get mocked prisma
const mockPrisma = vi.mocked(prisma);
const mockGetUserFromRequest = mockGetUserFromRequestFn;

// Helper to create mock request
function createMockRequest(
  body: object | null = null,
  method = 'GET',
  searchParams: Record<string, string> = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/cohorts');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  return new NextRequest(url, options);
}

describe('Cohorts API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/cohorts', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should return all cohorts for admin', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const mockCohorts = [
        {
          id: 'cohort-1',
          name: 'Cohort Alpha',
          slug: 'cohort-alpha',
          location: 'New York',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(),
          _count: { enrollments: 10, staffAssignments: 2, assignments: 5, sessions: 20 },
        },
        {
          id: 'cohort-2',
          name: 'Cohort Beta',
          slug: 'cohort-beta',
          location: 'Los Angeles',
          status: 'UPCOMING',
          startDate: new Date(),
          endDate: new Date(),
          _count: { enrollments: 0, staffAssignments: 1, assignments: 0, sessions: 0 },
        },
      ];

      mockPrisma.cohort.findMany.mockResolvedValue(mockCohorts);
      mockPrisma.cohort.count.mockResolvedValue(2);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cohorts).toHaveLength(2);
      expect(data.pagination).toBeDefined();
    });

    it('should return only assigned cohorts for instructors', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'instructor-1',
        role: 'INSTRUCTOR',
      });

      mockPrisma.staffAssignment.findMany.mockResolvedValue([{ cohortId: 'cohort-1' }]);
      mockPrisma.cohort.findMany.mockResolvedValue([
        {
          id: 'cohort-1',
          name: 'Cohort Alpha',
          slug: 'cohort-alpha',
          _count: { enrollments: 10, staffAssignments: 2, assignments: 5, sessions: 20 },
        },
      ]);
      mockPrisma.cohort.count.mockResolvedValue(1);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.staffAssignment.findMany).toHaveBeenCalledWith({
        where: { userId: 'instructor-1' },
        select: { cohortId: true },
      });
    });

    it('should return only enrolled cohorts for students', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'student-1',
        role: 'STUDENT',
      });

      mockPrisma.enrollment.findMany.mockResolvedValue([{ cohortId: 'cohort-1' }]);
      mockPrisma.cohort.findMany.mockResolvedValue([
        {
          id: 'cohort-1',
          name: 'Cohort Alpha',
          slug: 'cohort-alpha',
          _count: { enrollments: 10, staffAssignments: 2, assignments: 5, sessions: 20 },
        },
      ]);
      mockPrisma.cohort.count.mockResolvedValue(1);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith({
        where: { userId: 'student-1' },
        select: { cohortId: true },
      });
    });

    it('should filter cohorts by status', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.cohort.findMany.mockResolvedValue([]);
      mockPrisma.cohort.count.mockResolvedValue(0);

      const request = createMockRequest(null, 'GET', { status: 'ACTIVE' });
      await GET(request);

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should filter cohorts by location', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.cohort.findMany.mockResolvedValue([]);
      mockPrisma.cohort.count.mockResolvedValue(0);

      const request = createMockRequest(null, 'GET', { location: 'New York' });
      await GET(request);

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ location: 'New York' }),
        })
      );
    });

    it('should search cohorts by name or description', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.cohort.findMany.mockResolvedValue([]);
      mockPrisma.cohort.count.mockResolvedValue(0);

      const request = createMockRequest(null, 'GET', { search: 'python' });
      await GET(request);

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'python' } },
              { description: { contains: 'python' } },
              { location: { contains: 'python' } },
            ]),
          }),
        })
      );
    });

    it('should paginate cohorts', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.cohort.findMany.mockResolvedValue([]);
      mockPrisma.cohort.count.mockResolvedValue(30);

      const request = createMockRequest(null, 'GET', { page: '3', limit: '5' });
      const response = await GET(request);
      const data = await response.json();

      expect(mockPrisma.cohort.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5,
        })
      );
      expect(data.pagination.page).toBe(3);
      expect(data.pagination.totalPages).toBe(6);
    });
  });

  describe('POST /api/cohorts', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      const request = createMockRequest(
        {
          name: 'New Cohort',
          location: 'Chicago',
          startDate: '2024-01-01',
          endDate: '2024-06-01',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it('should return 403 if user is not admin', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'instructor-1',
        role: 'INSTRUCTOR',
      });

      const request = createMockRequest(
        {
          name: 'New Cohort',
          location: 'Chicago',
          startDate: '2024-01-01',
          endDate: '2024-06-01',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Admin');
    });

    it('should return 400 if required fields are missing', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const request = createMockRequest({ name: 'New Cohort' }, 'POST');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should create cohort with generated slug', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const mockCohort = {
        id: 'cohort-new',
        name: 'New Python Cohort',
        slug: 'new-python-cohort',
        location: 'Chicago',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        status: 'UPCOMING',
        _count: { enrollments: 0, staffAssignments: 0 },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cohort: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue(mockCohort),
          },
        };
        return callback(tx);
      });

      const request = createMockRequest(
        {
          name: 'New Python Cohort',
          location: 'Chicago',
          startDate: '2024-01-01',
          endDate: '2024-06-01',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.cohort).toBeDefined();
      expect(data.cohort.slug).toBe('new-python-cohort');
    });

    it('should generate unique slug if name already exists', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const mockCohort = {
        id: 'cohort-new',
        name: 'Duplicate Cohort',
        slug: 'duplicate-cohort-1',
        location: 'Miami',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-01'),
        status: 'UPCOMING',
        _count: { enrollments: 0, staffAssignments: 0 },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cohort: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ id: 'existing', slug: 'duplicate-cohort' })
              .mockResolvedValueOnce(null),
            create: vi.fn().mockResolvedValue(mockCohort),
          },
        };
        return callback(tx);
      });

      const request = createMockRequest(
        {
          name: 'Duplicate Cohort',
          location: 'Miami',
          startDate: '2024-01-01',
          endDate: '2024-06-01',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.cohort.slug).toBe('duplicate-cohort-1');
    });

    it('should set default values for optional fields', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      let capturedData: Record<string, unknown> | null = null;
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          cohort: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation((args) => {
              capturedData = args.data;
              return {
                id: 'cohort-new',
                ...args.data,
                _count: { enrollments: 0, staffAssignments: 0 },
              };
            }),
          },
        };
        return callback(tx);
      });

      const request = createMockRequest(
        {
          name: 'Minimal Cohort',
          location: 'Boston',
          startDate: '2024-01-01',
          endDate: '2024-06-01',
        },
        'POST'
      );
      await POST(request);

      expect(capturedData).toMatchObject({
        maxStudents: 25,
        mode: 'HYBRID',
        status: 'UPCOMING',
      });
    });
  });
});
