import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { verifyEmailConnection, sendEmail } from '@/lib/email';

// GET /api/email/test - Test SMTP connection (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const isConnected = await verifyEmailConnection();

    return NextResponse.json({
      connected: isConnected,
      config: {
        host: process.env.SMTP_HOST || 'not configured',
        port: process.env.SMTP_PORT || 'not configured',
        user: process.env.SMTP_USER ? '***configured***' : 'not configured',
        from: process.env.SMTP_FROM || 'not configured',
      },
    });
  } catch (error) {
    console.error('Error testing email connection:', error);
    return NextResponse.json({ error: 'Failed to test connection' }, { status: 500 });
  }
}

// POST /api/email/test - Send test email (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: '🧪 DOGM.AI Test Email',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
          <h1 style="color: #0f172a;">Test Email from DOGM.AI</h1>
          <p style="color: #334155;">
            This is a test email to verify your SMTP configuration is working correctly.
          </p>
          <p style="color: #64748b; font-size: 14px;">
            Sent at: ${new Date().toISOString()}
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">
            DOGM.AI Cohort Management Platform
          </p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: to,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
