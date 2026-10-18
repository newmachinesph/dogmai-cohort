import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin, isStaff } from '@/lib/auth'

// GET /api/submissions/[id]/comments - Get comments for a submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: submissionId } = await params

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check access
    if (!isAdmin(user) && !isStaff(user) && submission.userId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const where: Record<string, unknown> = { submissionId }

    // Students can't see private comments
    if (!isAdmin(user) && !isStaff(user)) {
      where.isPrivate = false
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST /api/submissions/[id]/comments - Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: submissionId } = await params
    const body = await request.json()
    const { content, isPrivate } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true }
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check access - students can comment on their own submissions, staff on their cohorts
    if (!isAdmin(user) && !isStaff(user) && submission.userId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only staff can make private comments
    const commentIsPrivate = (isAdmin(user) || isStaff(user)) && isPrivate === true

    const comment = await prisma.comment.create({
      data: {
        submissionId,
        userId: user.userId,
        content: content.trim(),
        isPrivate: commentIsPrivate
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true
          }
        }
      }
    })

    // Notify if staff comments (and not private)
    if ((isAdmin(user) || isStaff(user)) && !commentIsPrivate && submission.userId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: submission.userId,
          type: 'SYSTEM',
          title: 'New Comment',
          message: `${user.username} commented on your submission for "${submission.assignment.title}"`,
          link: `/student/submissions`
        }
      })
    }

    // Notify student's staff if student comments
    if (!isAdmin(user) && !isStaff(user)) {
      const staffAssignments = await prisma.staffAssignment.findMany({
        where: { cohortId: submission.assignment.cohortId },
        select: { userId: true }
      })

      await prisma.notification.createMany({
        data: staffAssignments.map(s => ({
          userId: s.userId,
          type: 'SYSTEM',
          title: 'Student Reply',
          message: `${user.username} replied on their submission for "${submission.assignment.title}"`,
          link: `/staff/grading`
        }))
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
