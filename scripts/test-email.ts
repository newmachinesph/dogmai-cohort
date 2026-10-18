/**
 * Email Testing Script
 *
 * Tests email sending with Mailpit or your configured SMTP server.
 *
 * Usage:
 *   1. Start Mailpit: docker compose up mailpit
 *   2. Update .env to use Mailpit:
 *      SMTP_HOST=localhost
 *      SMTP_PORT=1025
 *   3. Run: npx tsx scripts/test-email.ts
 *   4. View emails at: http://localhost:8025
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

import nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import { EmailVerification } from '../src/emails/email-verification';
import { PasswordReset } from '../src/emails/password-reset';
import { WelcomeEmail } from '../src/emails';

const isMailpit = process.env.SMTP_HOST === 'localhost' || process.env.SMTP_HOST === 'mailpit';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: process.env.SMTP_SECURE === 'true',
  ...(isMailpit ? {} : {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }),
});

async function testConnection() {
  console.log('\n📧 Email Test Script');
  console.log('='.repeat(50));
  console.log(`SMTP Host: ${process.env.SMTP_HOST || 'localhost'}`);
  console.log(`SMTP Port: ${process.env.SMTP_PORT || '1025'}`);
  console.log(`Using Mailpit: ${isMailpit ? 'Yes' : 'No'}`);
  console.log('='.repeat(50));

  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error);
    if (isMailpit) {
      console.log('\n💡 Hint: Make sure Mailpit is running:');
      console.log('   docker compose up mailpit');
    }
    return false;
  }
}

async function sendTestEmail(type: 'verification' | 'reset' | 'welcome' | 'simple') {
  const testEmail = 'test@example.com';
  const fromAddress = process.env.SMTP_FROM || 'DOGM.AI <hello@dogm.ai>';

  let subject: string;
  let html: string;

  switch (type) {
    case 'verification':
      subject = 'Test: Verify your email address - DOGM.AI';
      html = await render(
        EmailVerification({
          userName: 'Test User',
          verificationUrl: 'http://localhost:3000/verify-email?token=test-token-123',
          expiresInHours: 24
        })
      );
      break;

    case 'reset':
      subject = 'Test: Reset your password - DOGM.AI';
      html = await render(
        PasswordReset({
          userName: 'Test User',
          resetUrl: 'http://localhost:3000/reset-password?token=test-token-456',
          expiresInHours: 1
        })
      );
      break;

    case 'welcome':
      subject = 'Test: Welcome to DOGM.AI!';
      html = await render(
        WelcomeEmail({
          userName: 'Test User',
          userEmail: testEmail,
          role: 'STUDENT',
          cohortName: 'Test Cohort 2024',
          loginUrl: 'http://localhost:3000/login'
        })
      );
      break;

    case 'simple':
    default:
      subject = 'Test: Simple Email from DOGM.AI';
      html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Hello from DOGM.AI!</h1>
            <p>This is a simple test email to verify your SMTP configuration is working.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
          </body>
        </html>
      `;
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: testEmail,
      subject,
      html,
    });

    console.log(`✅ ${type.toUpperCase()} email sent successfully!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   To: ${testEmail}`);
    console.log(`   Subject: ${subject}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send ${type} email:`, error);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }

  console.log('Sending test emails...\n');

  // Send all test emails
  const results = await Promise.all([
    sendTestEmail('simple'),
    sendTestEmail('verification'),
    sendTestEmail('reset'),
    sendTestEmail('welcome'),
  ]);

  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${successCount}/${totalCount} emails sent successfully`);

  if (isMailpit) {
    console.log('\n🔗 View emails at: http://localhost:8025');
  }

  console.log('='.repeat(50) + '\n');

  process.exit(successCount === totalCount ? 0 : 1);
}

main().catch(console.error);
