import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePasswordResetToken, validateEmail } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { render } from '@react-email/components'
import { PasswordReset } from '@/emails/password-reset'

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    }

    // Check if user has a password (OAuth users may not)
    if (!user.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      })
    }

    // Generate reset token
    const { token, expires } = generatePasswordResetToken()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires
      }
    })

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // Send reset email
    const emailHtml = await render(
      PasswordReset({
        userName: user.displayName || user.username,
        resetUrl,
        expiresInHours: 1
      })
    )

    await sendEmail({
      to: user.email,
      subject: 'Reset your password - DOGM.AI',
      html: emailHtml
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
