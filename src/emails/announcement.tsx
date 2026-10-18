import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface AnnouncementEmailProps {
  recipientName: string;
  announcementTitle: string;
  announcementContent: string;
  authorName: string;
  authorRole: string;
  cohortName?: string;
  postedAt: string;
  announcementUrl: string;
  priority?: 'normal' | 'important' | 'urgent';
}

export function AnnouncementEmail({
  recipientName = 'Student',
  announcementTitle = 'Important Update',
  announcementContent = 'This is the announcement content...',
  authorName = 'Instructor',
  authorRole = 'Staff',
  cohortName,
  postedAt = 'January 15, 2024 at 10:00 AM',
  announcementUrl = 'https://dogm.ai/announcements/1',
  priority = 'normal',
}: AnnouncementEmailProps) {
  const priorityStyles = {
    normal: { color: '#2563eb', label: '', borderColor: '#e2e8f0' },
    important: { color: '#f59e0b', label: 'IMPORTANT', borderColor: '#fbbf24' },
    urgent: { color: '#dc2626', label: 'URGENT', borderColor: '#f87171' },
  };

  const { color, label, borderColor } = priorityStyles[priority];

  return (
    <BaseLayout previewText={`${label ? `[${label}] ` : ''}${announcementTitle}`}>
      {priority !== 'normal' && (
        <Section style={{ ...priorityBanner, backgroundColor: color }}>
          <Text style={priorityText}>{label}</Text>
        </Section>
      )}

      <Heading style={heading}>New Announcement</Heading>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        {cohortName
          ? `A new announcement has been posted in ${cohortName}.`
          : 'A new announcement has been posted.'}
      </Text>

      <Section style={{ ...announcementCard, borderColor }}>
        <Text style={announcementTitleStyle}>{announcementTitle}</Text>
        <Text style={metaText}>
          Posted by <strong>{authorName}</strong> ({authorRole})
        </Text>
        <Text style={metaText}>{postedAt}</Text>

        <Hr style={divider} />

        <Text style={contentText}>{announcementContent}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={announcementUrl}>
          View Announcement
        </Button>
      </Section>

      <Text style={paragraph}>
        Stay updated with the latest news and information.
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
const priorityBanner = {
  padding: '8px 16px',
  borderRadius: '4px',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const priorityText = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0',
  letterSpacing: '1px',
};

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

const announcementCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const announcementTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0 0 8px',
};

const metaText = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0 0 2px',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};

const contentText = {
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#334155',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
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

export default AnnouncementEmail;
