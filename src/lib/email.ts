import nodemailer from 'nodemailer';

// Detect if we're using Mailpit (local mail testing)
const isMailpit = process.env.SMTP_HOST === 'localhost' || process.env.SMTP_HOST === 'mailpit';
const isDevelopment = process.env.NODE_ENV === 'development';

// Email transporter configuration using SMTP
// For local development with Mailpit: SMTP_HOST=localhost SMTP_PORT=1025
// Mailpit UI available at http://localhost:8025
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.privateemail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // Use TLS for production, plain for Mailpit
  // Mailpit doesn't require auth, so only include auth for production
  ...(isMailpit ? {} : {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }),
});

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
  const fromAddress = process.env.SMTP_FROM || 'DOGM.AI <hello@dogm.ai>';

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || stripHtml(html),
      replyTo,
    });

    if (isMailpit && isDevelopment) {
      console.log(`📧 Email sent via Mailpit: ${info.messageId}`);
      console.log(`   To: ${Array.isArray(to) ? to.join(', ') : to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   View at: http://localhost:8025`);
    } else {
      console.log('Email sent:', info.messageId);
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    if (isMailpit) {
      console.error('💡 Hint: Make sure Mailpit is running. Start with: docker compose up mailpit');
    }
    return { success: false, error };
  }
}

// Strip HTML tags for plain text fallback
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Verify SMTP connection
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP connection error:', error);
    return false;
  }
}

// Email template types
export type EmailTemplateType =
  | 'assignment-reminder'
  | 'grade-notification'
  | 'announcement'
  | 'message-notification'
  | 'welcome'
  | 'password-reset'
  | 'email-verification'
  | 'weekly-digest';
