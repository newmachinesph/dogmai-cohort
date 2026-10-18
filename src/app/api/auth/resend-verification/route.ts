import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmailVerificationToken, validateEmail } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { render } from '@react-email/components'
import { EmailVerification } from '@/emails/email-verification'

// POST /api/auth/resend-verification - Resend email verification
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
        message: 'If an account exists with this email, a verification link has been sent'
      })
    }

    // Already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified'
      })
    }

    // Generate new verification token
    const { token, expires } = generateEmailVerificationToken()

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: token,
        emailVerifyExpires: expires
      }
    })

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`

    // Send verification email
    const emailHtml = await render(
      EmailVerification({
        userName: user.displayName || user.username,
        verificationUrl,
        expiresInHours: 24
      })
    )

    await sendEmail({
      to: user.email,
      subject: 'Verify your email address - DOGM.AI',
      html: emailHtml
    })

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred while sending verification email' },
      { status: 500 }
    )
  }
}
