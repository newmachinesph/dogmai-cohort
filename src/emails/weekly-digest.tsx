import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface DigestItem {
  title: string;
  description: string;
  url: string;
  type: 'assignment' | 'announcement' | 'grade' | 'message';
}

interface WeeklyDigestEmailProps {
  recipientName: string;
  weekRange: string;
  upcomingAssignments: Array<{
    title: string;
    dueDate: string;
    lessonTitle: string;
    url: string;
  }>;
  recentGrades: Array<{
    assignmentTitle: string;
    grade: string;
    percentage: number;
    url: string;
  }>;
  unreadMessages: number;
  announcements: Array<{
    title: string;
    excerpt: string;
    author: string;
    url: string;
  }>;
  dashboardUrl: string;
}

export function WeeklyDigestEmail({
  recipientName = 'Student',
  weekRange = 'January 8 - January 14, 2024',
  upcomingAssignments = [],
  recentGrades = [],
  unreadMessages = 0,
  announcements = [],
  dashboardUrl = 'https://dogm.ai/dashboard',
}: WeeklyDigestEmailProps) {
  const hasContent =
    upcomingAssignments.length > 0 ||
    recentGrades.length > 0 ||
    unreadMessages > 0 ||
    announcements.length > 0;

  return (
    <BaseLayout previewText={`Your DOGM.AI weekly digest for ${weekRange}`}>
      <Heading style={heading}>Weekly Digest</Heading>

      <Text style={weekLabel}>{weekRange}</Text>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        Here&apos;s a summary of what&apos;s happening in your courses this week.
      </Text>

      {!hasContent ? (
        <Section style={emptyState}>
          <Text style={emptyText}>
            🎉 All caught up! Nothing new this week.
          </Text>
        </Section>
      ) : (
        <>
          {/* Upcoming Assignments */}
          {upcomingAssignments.length > 0 && (
            <Section style={sectionCard}>
              <Text style={sectionTitle}>📚 Upcoming Assignments</Text>
              <Hr style={divider} />
              {upcomingAssignments.map((assignment, index) => (
                <Section key={index} style={itemRow}>
                  <Text style={itemTitle}>{assignment.title}</Text>
                  <Text style={itemMeta}>
                    {assignment.lessonTitle} • Due: {assignment.dueDate}
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          {/* Recent Grades */}
          {recentGrades.length > 0 && (
            <Section style={sectionCard}>
              <Text style={sectionTitle}>📊 Recent Grades</Text>
              <Hr style={divider} />
              {recentGrades.map((grade, index) => (
                <Section key={index} style={gradeRow}>
                  <Text style={itemTitle}>{grade.assignmentTitle}</Text>
                  <Text
                    style={{
                      ...gradeText,
                      color:
                        grade.percentage >= 80
                          ? '#16a34a'
                          : grade.percentage >= 60
                          ? '#f59e0b'
                          : '#dc2626',
                    }}
                  >
                    {grade.grade} ({grade.percentage}%)
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          {/* Unread Messages */}
          {unreadMessages > 0 && (
            <Section style={sectionCard}>
              <Text style={sectionTitle}>💬 Messages</Text>
              <Hr style={divider} />
              <Text style={messageCount}>
                You have <strong>{unreadMessages}</strong> unread{' '}
                {unreadMessages === 1 ? 'message' : 'messages'}
              </Text>
            </Section>
          )}

          {/* Announcements */}
          {announcements.length > 0 && (
            <Section style={sectionCard}>
              <Text style={sectionTitle}>📢 Announcements</Text>
              <Hr style={divider} />
              {announcements.map((announcement, index) => (
                <Section key={index} style={itemRow}>
                  <Text style={itemTitle}>{announcement.title}</Text>
                  <Text style={itemMeta}>by {announcement.author}</Text>
                  <Text style={excerptText}>{announcement.excerpt}</Text>
                </Section>
              ))}
            </Section>
          )}
        </>
      )}

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Go to Dashboard
        </Button>
      </Section>

      <Text style={paragraph}>
        Have a productive week!
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
  margin: '0 0 8px',
};

const weekLabel = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 24px',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#334155',
  margin: '0 0 16px',
};

const emptyState = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const emptyText = {
  fontSize: '15px',
  color: '#166534',
  margin: '0',
};

const sectionCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 0',
};

const sectionTitle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '12px 0',
};

const itemRow = {
  marginBottom: '12px',
};

const itemTitle = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#0f172a',
  margin: '0 0 2px',
};

const itemMeta = {
  fontSize: '12px',
  color: '#64748b',
  margin: '0',
};

const gradeRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const gradeText = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const messageCount = {
  fontSize: '14px',
  color: '#334155',
  margin: '0',
};

const excerptText = {
  fontSize: '13px',
  color: '#64748b',
  margin: '4px 0 0',
  lineHeight: '1.5',
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

export default WeeklyDigestEmail;
