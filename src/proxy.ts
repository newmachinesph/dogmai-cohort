import { NextRequest, NextResponse } from 'next/server'

// ============================================
// Global Middleware Configuration
// ============================================

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/cohorts',
  '/assignments',
  '/messages',
  '/settings',
  '/profile',
]

// Routes that should redirect if already authenticated
const AUTH_ROUTES = ['/login', '/signup']

// API routes that need size validation
const API_SIZE_LIMITS: Record<string, number> = {
  '/api/bulk': 10 * 1024 * 1024, // 10MB for bulk operations
  '/api/files': 50 * 1024 * 1024, // 50MB for file uploads
  '/api/upload': 50 * 1024 * 1024, // 50MB for uploads
}

const DEFAULT_API_SIZE_LIMIT = 1024 * 1024 // 1MB default

// ============================================
// Proxy Function (Next.js 16+)
// ============================================

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Add security headers to all responses
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('X-Download-Options', 'noopen')

  // HSTS - Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Permissions Policy - disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  )

  // Content Security Policy - Production-ready secure policy
  // Note: 'unsafe-inline' is needed for Next.js styled-jsx and inline styles
  // In production, consider using nonces for scripts
  const isDev = process.env.NODE_ENV === 'development'
  const cspDirectives = [
    "default-src 'self'",
    // Scripts: self + Next.js requires some inline for hydration
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // Dev needs eval for HMR
      : "script-src 'self' 'unsafe-inline'", // Prod: no eval
    // Styles: self + inline for styled-jsx
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Images: self + data URIs + HTTPS sources
    "img-src 'self' data: https: blob:",
    // Fonts: self + Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Connections: self + your API domain + WebSocket for dev
    isDev
      ? "connect-src 'self' https: ws: wss:"
      : `connect-src 'self' ${process.env.NEXT_PUBLIC_APP_URL || 'https:'}`,
    // Frame ancestors: prevent clickjacking
    "frame-ancestors 'none'",
    // Base URI: prevent base tag injection
    "base-uri 'self'",
    // Form actions: only submit to self
    "form-action 'self'",
    // Object/embed: disable plugins
    "object-src 'none'",
    // Upgrade insecure requests in production
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  // ============================================
  // API Request Size Validation
  // ============================================
  if (pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length')

    if (contentLength) {
      const size = parseInt(contentLength, 10)
      let maxSize = DEFAULT_API_SIZE_LIMIT

      // Check for route-specific limits
      for (const [route, limit] of Object.entries(API_SIZE_LIMITS)) {
        if (pathname.startsWith(route)) {
          maxSize = limit
          break
        }
      }

      if (size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Request body too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
            },
          },
          { status: 413 }
        )
      }
    }

    // Add CORS headers for API routes
    // SECURITY: Never use wildcard (*) with credentials in production
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
    if (allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    } else if (process.env.NODE_ENV === 'development') {
      // Only allow wildcard in development
      response.headers.set('Access-Control-Allow-Origin', '*')
      // Note: credentials not allowed with wildcard
    }
    // If no origin set in production, don't add CORS headers (same-origin only)

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token')
    response.headers.set('Access-Control-Max-Age', '86400') // Cache preflight for 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }

  // ============================================
  // Page Authentication Checks
  // ============================================
  const token = request.cookies.get('auth-token')?.value

  // Check protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// ============================================
// Proxy Configuration (Next.js 16+)
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
