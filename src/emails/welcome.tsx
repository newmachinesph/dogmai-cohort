import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  cohortName?: string;
  loginUrl: string;
  temporaryPassword?: string;
}

export function WelcomeEmail({
  userName = 'New User',
  userEmail = 'user@example.com',
  role = 'STUDENT',
  cohortName,
  loginUrl = 'https://dogm.ai/login',
  temporaryPassword,
}: WelcomeEmailProps) {
  const roleMessages = {
    STUDENT: cohortName
      ? `You've been enrolled in ${cohortName}. Get ready for an amazing learning experience!`
      : `You're now part of our learning community. Get ready for an amazing learning experience!`,
    STAFF: `You've been added as a staff member. You can now manage cohorts, lessons, and students.`,
    ADMIN: `You've been added as an administrator. You have full access to manage the entire platform.`,
  };

  const roleFeatures = {
    STUDENT: [
      'Access your lessons and course materials',
      'Submit assignments and track your progress',
      'Communicate with instructors and classmates',
      'View your grades and feedback',
    ],
    STAFF: [
      'Create and manage cohorts',
      'Design lessons and assignments',
      'Grade student submissions',
      'Communicate with students',
    ],
    ADMIN: [
      'Full platform administration',
      'Manage users and permissions',
      'Access analytics and reports',
      'Configure system settings',
    ],
  };

  return (
    <BaseLayout previewText={`Welcome to DOGM.AI, ${userName}!`}>
      <Heading style={heading}>Welcome to DOGM.AI!</Heading>

      <Text style={paragraph}>Hi {userName},</Text>

      <Text style={paragraph}>
        Welcome aboard! Your account has been created successfully.
      </Text>

      <Text style={paragraph}>{roleMessages[role]}</Text>

      <Section style={infoCard}>
        <Text style={cardTitle}>Your Account Details</Text>
        <Hr style={divider} />
        <Text style={detailRow}>
          <strong>Email:</strong> {userEmail}
        </Text>
        <Text style={detailRow}>
          <strong>Role:</strong> {role.charAt(0) + role.slice(1).toLowerCase()}
        </Text>
        {cohortName && (
          <Text style={detailRow}>
            <strong>Cohort:</strong> {cohortName}
          </Text>
        )}
        {temporaryPassword && (
          <>
            <Hr style={divider} />
            <Text style={passwordLabel}>Your temporary password:</Text>
            <Text style={passwordBox}>{temporaryPassword}</Text>
            <Text style={passwordNote}>
              Please change this password after your first login.
            </Text>
          </>
        )}
      </Section>

      <Section style={featureSection}>
        <Text style={featureTitle}>What you can do:</Text>
        {roleFeatures[role].map((feature, index) => (
          <Text key={index} style={featureItem}>
            ✓ {feature}
          </Text>
        ))}
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={loginUrl}>
          Get Started
        </Button>
      </Section>

      <Text style={paragraph}>
        If you have any questions, don&apos;t hesitate to reach out to our support team.
      </Text>

      <Text style={paragraph}>
        Welcome to the community!
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

const infoCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const cardTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0 0 12px',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
};

const detailRow = {
  fontSize: '14px',
  color: '#334155',
  margin: '8px 0',
};

const passwordLabel = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#64748b',
  margin: '0 0 8px',
};

const passwordBox = {
  backgroundColor: '#ffffff',
  border: '1px dashed #cbd5e1',
  borderRadius: '4px',
  padding: '12px 16px',
  fontSize: '16px',
  fontFamily: 'monospace',
  color: '#0f172a',
  textAlign: 'center' as const,
  margin: '0 0 8px',
};

const passwordNote = {
  fontSize: '12px',
  color: '#f59e0b',
  margin: '0',
};

const featureSection = {
  margin: '24px 0',
};

const featureTitle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0 0 12px',
};

const featureItem = {
  fontSize: '14px',
  color: '#334155',
  margin: '8px 0',
  paddingLeft: '8px',
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

export default WelcomeEmail;
