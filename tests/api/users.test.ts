import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma - declare before vi.mock
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
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
import { GET, POST } from '@/app/api/users/route';

// Get mocked prisma
const mockPrisma = vi.mocked(prisma);
const mockGetUserFromRequest = mockGetUserFromRequestFn;

// Helper to create mock request
function createMockRequest(
  body: object | null = null,
  method = 'GET',
  searchParams: Record<string, string> = {}
): NextRequest {
  const url = new URL('http://localhost:3000/api/users');
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

describe('Users API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 403 if not authenticated', async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
    });

    it('should return 403 if user is not admin', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'user-1',
        role: 'STUDENT',
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      // Standardized API format: error is an object with message property
      expect(data.error.message).toContain('Admin');
    });

    it('should return users list for admin', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          displayName: 'User One',
          role: 'STUDENT',
          isActive: true,
          createdAt: new Date(),
          _count: { enrollments: 1, staffAssignments: 0, submissions: 5 },
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          username: 'user2',
          displayName: 'User Two',
          role: 'INSTRUCTOR',
          isActive: true,
          createdAt: new Date(),
          _count: { enrollments: 0, staffAssignments: 2, submissions: 0 },
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.user.count.mockResolvedValue(2);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(2);
    });

    it('should filter users by role', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const request = createMockRequest(null, 'GET', { role: 'INSTRUCTOR' });
      await GET(request);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'INSTRUCTOR' }),
        })
      );
    });

    it('should filter users by status', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const request = createMockRequest(null, 'GET', { status: 'active' });
      await GET(request);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should filter users by search term', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const request = createMockRequest(null, 'GET', { search: 'john' });
      await GET(request);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { email: { contains: 'john' } },
              { username: { contains: 'john' } },
              { displayName: { contains: 'john' } },
            ]),
          }),
        })
      );
    });

    it('should paginate results', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(50);

      const request = createMockRequest(null, 'GET', { page: '2', limit: '10' });
      const response = await GET(request);
      const data = await response.json();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(data.meta.page).toBe(2);
      expect(data.meta.limit).toBe(10);
      expect(data.meta.total).toBe(50);
    });
  });

  describe('POST /api/users', () => {
    it('should return 403 if not authenticated', async () => {
      mockGetUserFromRequest.mockResolvedValue(null);

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test123!',
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
        userId: 'user-1',
        role: 'STUDENT',
      });

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test123!',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      // Standardized API format: error is an object with message property
      expect(data.error.message).toContain('Admin');
    });

    it('should return 400 if required fields are missing', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const request = createMockRequest({ email: 'new@example.com' }, 'POST');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      // Standardized API format: error is an object
      expect(data.error).toBeDefined();
      expect(data.error.message).toBeDefined();
    });

    it('should return 400 if email format is invalid', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const request = createMockRequest(
        {
          email: 'invalid-email',
          username: 'newuser',
          password: 'Test123!',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      // Standardized API format: error.message contains the error text
      expect(data.error.message.toLowerCase()).toContain('email');
    });

    it('should return 400 if password is weak', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'weak',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should return 409 if email already exists', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: 'new@example.com',
      });

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test123!',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      // Standardized API format: error.message contains the error text
      expect(data.error.message).toContain('Email');
    });

    it('should return 409 if username already exists', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        username: 'newuser',
      });

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test123!',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
    });

    it('should create user successfully with admin privileges', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-1',
        email: 'new@example.com',
        username: 'newuser',
        displayName: 'New User',
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date(),
      });

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test123!',
          displayName: 'New User',
          role: 'STUDENT',
        },
        'POST'
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
      expect(data.data.user.email).toBe('new@example.com');
    });

    it('should set emailVerified to true for admin-created users', async () => {
      mockGetUserFromRequest.mockResolvedValue({
        userId: 'admin-1',
        role: 'ADMIN',
      });

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-1',
        email: 'new@example.com',
        username: 'newuser',
        role: 'STUDENT',
        isActive: true,
        createdAt: new Date(),
      });

      const request = createMockRequest(
        {
          email: 'new@example.com',
          username: 'newuser',
          password: 'Test123!',
        },
        'POST'
      );
      await POST(request);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailVerified: true,
          }),
        })
      );
    });
  });
});
