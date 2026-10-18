import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff, hashPassword, validatePassword, validateEmail, validateUsername } from '@/lib/auth'

// GET /api/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include')?.split(',') || []

    // Users can view themselves, admins can view anyone, staff can view students
    const isOwn = currentUser.userId === id
    const hasAdminAccess = isAdmin(currentUser)
    const hasStaffAccess = isStaff(currentUser)

    if (!isOwn && !hasAdminAccess && !hasStaffAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build include object based on query params
    const includeObj: Record<string, unknown> = {
      enrollments: {
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              location: true,
              startDate: true,
              endDate: true
            }
          }
        }
      },
      staffAssignments: {
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              location: true
            }
          }
        }
      }
    }

    // Include submissions if requested (for staff viewing students)
    if (include.includes('submissions') && (hasAdminAccess || hasStaffAccess)) {
      includeObj.submissions = {
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              maxPoints: true,
              passingScore: true,
              dueDate: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        take: 50
      }
    }

    // Include attendance if requested
    if (include.includes('attendance') && (hasAdminAccess || hasStaffAccess)) {
      includeObj.attendanceRecords = {
        include: {
          session: {
            select: {
              id: true,
              title: true,
              date: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        ...includeObj,
        _count: {
          select: {
            submissions: true,
            attendanceRecords: true,
            notifications: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Rename attendanceRecords to attendance for consistency
    const formattedUser = {
      ...user,
      attendance: (user as Record<string, unknown>).attendanceRecords,
      attendanceRecords: undefined
    }

    return NextResponse.json({ user: formattedUser })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { email, username, password, displayName, avatarUrl, role, isActive } = body

    // Users can update themselves, admins can update anyone
    const isOwn = currentUser.userId === id
    if (!isAdmin(currentUser) && !isOwn) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check user exists
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Non-admins cannot change their own role or active status
    if (!isAdmin(currentUser) && (role !== undefined || isActive !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot change role or status' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (email !== undefined && email !== existing.email) {
      if (!validateEmail(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
      const emailExists = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), id: { not: id } }
      })
      if (emailExists) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
      }
      updateData.email = email.toLowerCase()
    }

    if (username !== undefined && username !== existing.username) {
      const usernameValidation = validateUsername(username)
      if (!usernameValidation.valid) {
        return NextResponse.json({ error: usernameValidation.error }, { status: 400 })
      }
      const usernameExists = await prisma.user.findFirst({
        where: { username: username.toLowerCase(), id: { not: id } }
      })
      if (usernameExists) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
      }
      updateData.username = username.toLowerCase()
    }

    if (password !== undefined) {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.errors.join(', ') }, { status: 400 })
      }
      updateData.passwordHash = await hashPassword(password)
    }

    if (displayName !== undefined) updateData.displayName = displayName
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (role !== undefined && isAdmin(currentUser)) updateData.role = role
    if (isActive !== undefined && isAdmin(currentUser)) updateData.isActive = isActive

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getUserFromRequest(request)
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (currentUser.userId === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete by deactivating instead of hard delete
    // This preserves data integrity for submissions, grades, etc.
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
