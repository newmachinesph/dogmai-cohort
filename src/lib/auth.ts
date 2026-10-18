import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

// Types
export type Role = "ADMIN" | "STAFF" | "STUDENT";

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// Constants
const JWT_EXPIRES_IN = "7d";
const SALT_ROUNDS = 12;

// Get JWT secret with validation
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!secret) {
    // In development only, use a consistent dev secret but warn loudly
    if (isDevelopment) {
      console.warn(
        "\x1b[33m⚠️  WARNING: JWT_SECRET is not set. Using development secret.\x1b[0m"
      );
      console.warn(
        "\x1b[33m   This is INSECURE and must not be used in production!\x1b[0m"
      );
      return "INSECURE_DEV_SECRET_DO_NOT_USE_IN_PRODUCTION_" + Date.now().toString(36);
    }
    // In production, throw an error - never use fallback
    throw new Error(
      "CRITICAL: JWT_SECRET environment variable is required. " +
      "Generate one with: openssl rand -base64 48"
    );
  }

  // Validate secret strength
  const MIN_LENGTH_PROD = 64; // 256-bit minimum for production
  const MIN_LENGTH_DEV = 32;  // 128-bit minimum for development
  const minLength = isProduction ? MIN_LENGTH_PROD : MIN_LENGTH_DEV;

  if (secret.length < minLength) {
    if (isProduction) {
      throw new Error(
        `CRITICAL: JWT_SECRET must be at least ${MIN_LENGTH_PROD} characters in production. ` +
        `Current length: ${secret.length}. Generate one with: openssl rand -base64 48`
      );
    } else {
      console.warn(
        `\x1b[33m⚠️  WARNING: JWT_SECRET is only ${secret.length} chars. ` +
        `Recommended: at least ${MIN_LENGTH_PROD} for production.\x1b[0m`
      );
    }
  }

  // Check for common insecure patterns
  const insecurePatterns = [
    'secret', 'password', 'changeme', 'dev', 'test', 'example', 'default'
  ];
  const lowerSecret = secret.toLowerCase();
  if (isProduction && insecurePatterns.some(p => lowerSecret.includes(p))) {
    throw new Error(
      "CRITICAL: JWT_SECRET appears to contain insecure patterns. " +
      "Use a randomly generated secret: openssl rand -base64 48"
    );
  }

  return secret;
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password validation
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// JWT utilities
export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === "object" && decoded !== null) {
      return decoded as JWTPayload;
    }
    return null;
  } catch {
    return null;
  }
}

// Extract token from Authorization header
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  // Support both "Bearer token" and just "token" formats
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return authHeader;
}

// Get user from request
export async function getUserFromRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  // Try cookie first
  const cookieToken = request.cookies.get("auth-token")?.value;
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) return payload;
  }

  // Try Authorization header
  const authHeader = request.headers.get("authorization");
  const headerToken = extractToken(authHeader);
  if (headerToken) {
    return verifyToken(headerToken);
  }

  return null;
}

// Role-based access control
const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  STAFF: 2,
  STUDENT: 1,
};

export function hasPermission(userRole: Role, requiredRoles: Role[]): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  return requiredRoles.some((role) => userLevel >= ROLE_HIERARCHY[role]);
}

export function isAdmin(user: JWTPayload | Role): boolean {
  const role = typeof user === "string" ? user : user.role;
  return role === "ADMIN";
}

export function isStaff(user: JWTPayload | Role): boolean {
  const role = typeof user === "string" ? user : user.role;
  return role === "ADMIN" || role === "STAFF";
}

export function isStudent(user: JWTPayload | Role): boolean {
  const role = typeof user === "string" ? user : user.role;
  return role === "STUDENT";
}

// Rate limiting (in-memory store - use Redis in production)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute - realistic for user experience
const MAX_ATTEMPTS = 5; // 5 attempts per minute

export function checkRateLimit(
  identifier: string
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  // Clean up old entries periodically
  if (loginAttempts.size > 10000) {
    for (const [key, value] of loginAttempts.entries()) {
      if (now - value.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.delete(key);
      }
    }
  }

  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  // Reset if window has passed
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  // Check if over limit
  if (attempts.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil(
      (RATE_LIMIT_WINDOW - (now - attempts.firstAttempt)) / 1000
    );
    return { allowed: false, retryAfter };
  }

  // Increment count
  attempts.count++;
  return { allowed: true };
}

export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

// Username validation
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }
  return { valid: true };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Secure random token generation for email verification and password reset
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  // Use crypto for better randomness in Node.js environment
  const randomValues = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < length; i++) {
    token += chars.charAt(randomValues[i] % chars.length);
  }
  return token;
}

// Generate email verification token with expiry
export function generateEmailVerificationToken(): { token: string; expires: Date } {
  const token = generateSecureToken(64);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, expires };
}

// Generate password reset token with expiry
export function generatePasswordResetToken(): { token: string; expires: Date } {
  const token = generateSecureToken(64);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expires };
}

// CSRF Protection
const CSRF_TOKEN_LENGTH = 64; // Increased for better security
const csrfTokens = new Map<string, { token: string; createdAt: number }>();
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export function generateCsrfToken(sessionId: string): string {
  // Clean up expired tokens periodically
  const now = Date.now();
  if (csrfTokens.size > 5000) {
    for (const [key, value] of csrfTokens.entries()) {
      if (now - value.createdAt > CSRF_TOKEN_EXPIRY) {
        csrfTokens.delete(key);
      }
    }
  }

  // Generate cryptographically secure token
  const token = generateSecureToken(CSRF_TOKEN_LENGTH);

  csrfTokens.set(sessionId, { token, createdAt: now });
  return token;
}

export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored) return false;

  const now = Date.now();
  if (now - stored.createdAt > CSRF_TOKEN_EXPIRY) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

export function getCsrfToken(request: NextRequest): string | null {
  // Check header first (preferred)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;

  // Check body for form submissions
  return null;
}
