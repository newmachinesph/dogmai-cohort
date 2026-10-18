import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, JWTPayload, isAdmin, isStaff, validateCsrfToken, getCsrfToken } from './auth'
import {
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  rateLimitedResponse,
  internalErrorResponse,
  ErrorCodes,
  errorResponse,
} from './api-utils'

// ============================================
// Request Size Limits
// ============================================

const DEFAULT_MAX_BODY_SIZE = 1024 * 1024 // 1MB default
const MAX_BODY_SIZES: Record<string, number> = {
  '/api/bulk/import-students': 10 * 1024 * 1024, // 10MB for CSV imports
  '/api/files': 50 * 1024 * 1024, // 50MB for file uploads
  '/api/upload': 50 * 1024 * 1024, // 50MB for file uploads
}

export function getMaxBodySize(pathname: string): number {
  for (const [pattern, size] of Object.entries(MAX_BODY_SIZES)) {
    if (pathname.startsWith(pattern)) {
      return size
    }
  }
  return DEFAULT_MAX_BODY_SIZE
}

// ============================================
// CSRF Protection
// ============================================

const CSRF_EXEMPT_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/csrf',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/uploadthing',
]

const CSRF_REQUIRED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH']

export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route))
}

export function requiresCsrf(method: string): boolean {
  return CSRF_REQUIRED_METHODS.includes(method.toUpperCase())
}

// ============================================
// Authentication Middleware Wrapper
// ============================================

export type AuthRequirement = 'none' | 'required' | 'admin' | 'staff'

export interface MiddlewareOptions {
  auth?: AuthRequirement
  maxBodySize?: number
  csrfProtection?: boolean
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
}

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

type RouteHandler = (
  request: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

// ============================================
// Input Size Validation
// ============================================

export async function validateRequestSize(
  request: NextRequest,
  maxSize: number
): Promise<{ valid: boolean; error?: NextResponse }> {
  const contentLength = request.headers.get('content-length')

  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > maxSize) {
      return {
        valid: false,
        error: errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `Request body too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
          undefined,
          413
        ),
      }
    }
  }

  return { valid: true }
}

// ============================================
// CSRF Validation
// ============================================

export function validateCsrf(
  request: NextRequest
): { valid: boolean; error?: NextResponse } {
  const csrfToken = getCsrfToken(request)
  const sessionId = request.cookies.get('auth-token')?.value

  if (!sessionId) {
    // No session means no CSRF protection needed (will fail auth anyway)
    return { valid: true }
  }

  if (!csrfToken) {
    return {
      valid: false,
      error: errorResponse(
        ErrorCodes.FORBIDDEN,
        'CSRF token missing',
        undefined,
        403
      ),
    }
  }

  if (!validateCsrfToken(sessionId, csrfToken)) {
    return {
      valid: false,
      error: errorResponse(
        ErrorCodes.FORBIDDEN,
        'Invalid CSRF token',
        undefined,
        403
      ),
    }
  }

  return { valid: true }
}

// ============================================
// Main Middleware Wrapper
// ============================================

export function withMiddleware(
  handler: RouteHandler,
  options: MiddlewareOptions = {}
): RouteHandler {
  const {
    auth = 'none',
    maxBodySize,
    csrfProtection = true,
  } = options

  return async (request: AuthenticatedRequest, context) => {
    try {
      const pathname = new URL(request.url).pathname

      // 1. Validate request body size
      const effectiveMaxSize = maxBodySize || getMaxBodySize(pathname)
      const sizeValidation = await validateRequestSize(request, effectiveMaxSize)
      if (!sizeValidation.valid) {
        return sizeValidation.error!
      }

      // 2. CSRF protection for mutation methods
      if (
        csrfProtection &&
        requiresCsrf(request.method) &&
        !isCsrfExempt(pathname)
      ) {
        const csrfValidation = validateCsrf(request)
        if (!csrfValidation.valid) {
          return csrfValidation.error!
        }
      }

      // 3. Authentication
      if (auth !== 'none') {
        const user = await getUserFromRequest(request)

        if (!user) {
          return unauthorizedResponse()
        }

        // Role-based checks
        if (auth === 'admin' && !isAdmin(user)) {
          return forbiddenResponse('Admin access required')
        }

        if (auth === 'staff' && !isStaff(user)) {
          return forbiddenResponse('Staff access required')
        }

        // Attach user to request
        request.user = user
      }

      // 4. Execute handler
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      return internalErrorResponse()
    }
  }
}

// ============================================
// Convenience Wrappers
// ============================================

export function withAuth(handler: RouteHandler): RouteHandler {
  return withMiddleware(handler, { auth: 'required' })
}

export function withAdminAuth(handler: RouteHandler): RouteHandler {
  return withMiddleware(handler, { auth: 'admin' })
}

export function withStaffAuth(handler: RouteHandler): RouteHandler {
  return withMiddleware(handler, { auth: 'staff' })
}

export function withPublicAccess(handler: RouteHandler): RouteHandler {
  return withMiddleware(handler, { auth: 'none', csrfProtection: false })
}

// ============================================
// Route Handler Builder
// ============================================

export interface RouteHandlers {
  GET?: RouteHandler
  POST?: RouteHandler
  PUT?: RouteHandler
  DELETE?: RouteHandler
  PATCH?: RouteHandler
}

export function createRouteHandlers(
  handlers: RouteHandlers,
  defaultOptions: MiddlewareOptions = {}
): RouteHandlers {
  const wrapped: RouteHandlers = {}

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrapped[method as keyof RouteHandlers] = withMiddleware(
        handler,
        defaultOptions
      )
    }
  }

  return wrapped
}
