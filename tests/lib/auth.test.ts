import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateUsername,
  validateEmail,
  generateToken,
  verifyToken,
  hasPermission,
  isAdmin,
  isStaff,
  isStudent,
  checkRateLimit,
  resetRateLimit,
} from '@/lib/auth';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword123', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept valid password', () => {
      const result = validatePassword('TestPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Test1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('testpass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('TESTPASS123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should reject password without number', () => {
      const result = validatePassword('TestPassword');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number'
      );
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePassword('ab');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Username Validation', () => {
    it('should accept valid username', () => {
      const result = validateUsername('john_doe-123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject username shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
    });

    it('should reject username longer than 30 characters', () => {
      const result = validateUsername('a'.repeat(31));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at most 30 characters');
    });

    it('should reject username with invalid characters', () => {
      const result = validateUsername('user@name!');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only contain');
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user domain.com')).toBe(false);
    });
  });

  describe('JWT Token', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'STUDENT' as const,
    };

    it('should generate a valid token', () => {
      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should verify a valid token', () => {
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for tampered token', () => {
      const token = generateToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const decoded = verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Role-Based Access Control', () => {
    describe('hasPermission', () => {
      it('should allow admin access to all roles', () => {
        expect(hasPermission('ADMIN', ['ADMIN'])).toBe(true);
        expect(hasPermission('ADMIN', ['STAFF'])).toBe(true);
        expect(hasPermission('ADMIN', ['STUDENT'])).toBe(true);
      });

      it('should allow staff access to staff and student roles', () => {
        expect(hasPermission('STAFF', ['ADMIN'])).toBe(false);
        expect(hasPermission('STAFF', ['STAFF'])).toBe(true);
        expect(hasPermission('STAFF', ['STUDENT'])).toBe(true);
      });

      it('should only allow student access to student role', () => {
        expect(hasPermission('STUDENT', ['ADMIN'])).toBe(false);
        expect(hasPermission('STUDENT', ['STAFF'])).toBe(false);
        expect(hasPermission('STUDENT', ['STUDENT'])).toBe(true);
      });
    });

    describe('isAdmin', () => {
      it('should return true for admin role', () => {
        expect(isAdmin('ADMIN')).toBe(true);
        expect(isAdmin({ userId: '1', email: '', username: '', role: 'ADMIN' })).toBe(true);
      });

      it('should return false for non-admin roles', () => {
        expect(isAdmin('STAFF')).toBe(false);
        expect(isAdmin('STUDENT')).toBe(false);
      });
    });

    describe('isStaff', () => {
      it('should return true for admin and staff roles', () => {
        expect(isStaff('ADMIN')).toBe(true);
        expect(isStaff('STAFF')).toBe(true);
      });

      it('should return false for student role', () => {
        expect(isStaff('STUDENT')).toBe(false);
      });
    });

    describe('isStudent', () => {
      it('should return true only for student role', () => {
        expect(isStudent('STUDENT')).toBe(true);
        expect(isStudent('STAFF')).toBe(false);
        expect(isStudent('ADMIN')).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Reset rate limits between tests
      resetRateLimit('test-user');
    });

    it('should allow first request', () => {
      const result = checkRateLimit('test-user');
      expect(result.allowed).toBe(true);
    });

    it('should allow requests under limit', () => {
      for (let i = 0; i < 4; i++) {
        const result = checkRateLimit('rate-test-user');
        expect(result.allowed).toBe(true);
      }
      resetRateLimit('rate-test-user');
    });

    it('should block requests over limit', () => {
      const identifier = 'blocked-user';

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier);
      }

      // 6th request should be blocked
      const result = checkRateLimit(identifier);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();

      resetRateLimit(identifier);
    });

    it('should reset after calling resetRateLimit', () => {
      const identifier = 'reset-test-user';

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier);
      }

      // Reset
      resetRateLimit(identifier);

      // Should be allowed again
      const result = checkRateLimit(identifier);
      expect(result.allowed).toBe(true);

      resetRateLimit(identifier);
    });
  });
});
