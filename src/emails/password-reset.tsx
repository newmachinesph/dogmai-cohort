import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface PasswordResetProps {
  userName: string;
  resetUrl: string;
  expiresInHours?: number;
}

export function PasswordReset({
  userName = 'User',
  resetUrl = 'https://dogm.ai/reset-password?token=xxx',
  expiresInHours = 1,
}: PasswordResetProps) {
  return (
    <BaseLayout previewText="Reset your DOGM.AI password">
      <Heading style={heading}>Reset Your Password</Heading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        We received a request to reset the password for your DOGM.AI account. Click the button below to create a new password.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={resetUrl}>
          Reset Password
        </Button>
      </Section>

      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>

      <Section style={linkBox}>
        <Text style={linkText}>{resetUrl}</Text>
      </Section>

      <Hr style={divider} />

      <Section style={warningSection}>
        <Text style={warningTitle}>Important:</Text>
        <Text style={warningText}>
          This link will expire in {expiresInHours} hour{expiresInHours > 1 ? 's' : ''}.
        </Text>
        <Text style={warningText}>
          If you didn&apos;t request a password reset, please ignore this email or contact support if you have concerns about your account security.
        </Text>
      </Section>

      <Text style={paragraph}>
        Best regards,
        <br />
        The DOGM.AI Team
      </Text>
    </BaseLayout>
  );
}

// Styles
const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#334155',
  margin: '0 0 16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
};

const linkBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  padding: '12px',
  margin: '0 0 24px',
};

const linkText = {
  fontSize: '13px',
  color: '#2563eb',
  wordBreak: 'break-all' as const,
  margin: '0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

const warningSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fcd34d',
  borderRadius: '6px',
  padding: '16px',
  margin: '0 0 24px',
};

const warningTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#92400e',
  margin: '0 0 8px',
};

const warningText = {
  fontSize: '13px',
  color: '#92400e',
  margin: '0 0 8px',
};

export default PasswordReset;
