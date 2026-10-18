import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface EmailVerificationProps {
  userName: string;
  verificationUrl: string;
  expiresInHours?: number;
}

export function EmailVerification({
  userName = 'User',
  verificationUrl = 'https://dogm.ai/verify?token=xxx',
  expiresInHours = 24,
}: EmailVerificationProps) {
  return (
    <BaseLayout previewText="Verify your email address for DOGM.AI">
      <Heading style={heading}>Verify Your Email Address</Heading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Thanks for signing up for DOGM.AI! Please verify your email address by clicking the button below.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={verificationUrl}>
          Verify Email Address
        </Button>
      </Section>

      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>

      <Section style={linkBox}>
        <Text style={linkText}>{verificationUrl}</Text>
      </Section>

      <Hr style={divider} />

      <Text style={warningText}>
        This link will expire in {expiresInHours} hours. If you didn&apos;t create an account with DOGM.AI, you can safely ignore this email.
      </Text>

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
  backgroundColor: '#2563eb',
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

const warningText = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0 0 24px',
};

export default EmailVerification;
