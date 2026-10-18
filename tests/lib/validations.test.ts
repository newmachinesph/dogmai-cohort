import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  createCohortSchema,
  createAssignmentSchema,
  gradeSubmissionSchema,
  createMessageSchema,
  paginationSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should accept valid user data', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should accept user with optional fields', () => {
      const validUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
        role: 'STAFF',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('STAFF');
      }
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject short username', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'ab',
        password: 'Password123',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        role: 'SUPERADMIN',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('should accept partial user data', () => {
      const result = updateUserSchema.safeParse({ displayName: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept nullable fields', () => {
      const result = updateUserSchema.safeParse({
        bio: null,
        avatarUrl: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid credentials', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({ password: 'test' });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createCohortSchema', () => {
    it('should accept valid cohort', () => {
      const result = createCohortSchema.safeParse({
        name: 'Cohort 2024',
      });
      expect(result.success).toBe(true);
    });

    it('should accept cohort with all fields', () => {
      const result = createCohortSchema.safeParse({
        name: 'Cohort 2024',
        description: 'A great cohort',
        status: 'ACTIVE',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-06-30T00:00:00.000Z',
        maxStudents: 30,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = createCohortSchema.safeParse({
        name: 'Cohort 2024',
        status: 'INVALID',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative maxStudents', () => {
      const result = createCohortSchema.safeParse({
        name: 'Cohort 2024',
        maxStudents: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createAssignmentSchema', () => {
    it('should accept valid assignment', () => {
      const result = createAssignmentSchema.safeParse({
        title: 'Homework 1',
        cohortId: 'cohort-123',
      });
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const result = createAssignmentSchema.safeParse({
        title: 'Homework 1',
        cohortId: 'cohort-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('HOMEWORK');
        expect(result.data.maxPoints).toBe(100);
        expect(result.data.isPublished).toBe(false);
        expect(result.data.allowLateSubmissions).toBe(true);
      }
    });

    it('should reject missing title', () => {
      const result = createAssignmentSchema.safeParse({
        cohortId: 'cohort-123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing cohortId', () => {
      const result = createAssignmentSchema.safeParse({
        title: 'Homework 1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('gradeSubmissionSchema', () => {
    it('should accept valid grade', () => {
      const result = gradeSubmissionSchema.safeParse({
        score: 85,
      });
      expect(result.success).toBe(true);
    });

    it('should accept grade with feedback', () => {
      const result = gradeSubmissionSchema.safeParse({
        score: 90,
        feedback: 'Great work!',
        status: 'GRADED',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative score', () => {
      const result = gradeSubmissionSchema.safeParse({
        score: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = gradeSubmissionSchema.safeParse({
        score: 85,
        status: 'PENDING',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createMessageSchema', () => {
    it('should accept valid message', () => {
      const result = createMessageSchema.safeParse({
        content: 'Hello, world!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = createMessageSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding max length', () => {
      const result = createMessageSchema.safeParse({
        content: 'a'.repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should apply default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should coerce string values', () => {
      const result = paginationSchema.safeParse({
        page: '2',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({
        limit: 200,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-positive values', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});
