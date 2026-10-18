import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, hashPassword, validatePassword, validateEmail, validateUsername } from '@/lib/auth'
import {
  successResponse,
  forbiddenResponse,
  validationErrorResponse,
  internalErrorResponse,
  createdResponse,
  conflictResponse,
  getPaginationMeta,
} from '@/lib/api-utils'

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return forbiddenResponse('Admin access required')
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20))
    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}

    if (role && role !== 'all') {
      where.role = role
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
        { displayName: { contains: search } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              staffAssignments: true,
              submissions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return successResponse({ users }, getPaginationMeta(page, limit, total))
  } catch (error) {
    console.error('Error fetching users:', error)
    return internalErrorResponse('Failed to fetch users')
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return forbiddenResponse('Admin access required')
    }

    const body = await request.json()
    const { email, username, password, displayName, role, isActive } = body

    // Validate required fields
    if (!email || !username || !password) {
      return validationErrorResponse('Email, username, and password are required')
    }

    // Validate email
    if (!validateEmail(email)) {
      return validationErrorResponse('Invalid email format', { email: ['Invalid email format'] })
    }

    // Validate username
    const usernameValidation = validateUsername(username)
    if (!usernameValidation.valid) {
      return validationErrorResponse(usernameValidation.error || 'Invalid username', {
        username: [usernameValidation.error || 'Invalid username']
      })
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return validationErrorResponse('Password does not meet requirements', {
        password: passwordValidation.errors
      })
    }

    // Check for existing email/username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return conflictResponse('Email already registered')
      }
      return conflictResponse('Username already taken')
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        displayName: displayName || null,
        role: role || 'STUDENT',
        isActive: isActive !== false,
        emailVerified: true, // Admin-created users are pre-verified
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    return createdResponse({ user: newUser }, 'User created successfully')
  } catch (error) {
    console.error('Error creating user:', error)
    return internalErrorResponse('Failed to create user')
  }
}
