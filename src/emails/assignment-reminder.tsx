import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface AssignmentReminderEmailProps {
  studentName: string;
  assignmentTitle: string;
  lessonTitle: string;
  cohortName: string;
  dueDate: string;
  hoursRemaining: number;
  assignmentUrl: string;
}

export function AssignmentReminderEmail({
  studentName = 'Student',
  assignmentTitle = 'Week 1 Assignment',
  lessonTitle = 'Introduction to the Course',
  cohortName = 'Spring 2024 Cohort',
  dueDate = 'January 15, 2024 at 11:59 PM',
  hoursRemaining = 24,
  assignmentUrl = 'https://dogm.ai/student/assignments/1',
}: AssignmentReminderEmailProps) {
  const urgencyColor = hoursRemaining <= 6 ? '#dc2626' : hoursRemaining <= 24 ? '#f59e0b' : '#2563eb';
  const urgencyText = hoursRemaining <= 6
    ? 'Due very soon!'
    : hoursRemaining <= 24
    ? 'Due tomorrow'
    : 'Upcoming deadline';

  return (
    <BaseLayout previewText={`Assignment reminder: ${assignmentTitle} is due ${urgencyText.toLowerCase()}`}>
      <Heading style={heading}>Assignment Reminder</Heading>

      <Text style={paragraph}>Hi {studentName},</Text>

      <Text style={paragraph}>
        This is a friendly reminder that you have an assignment due soon.
      </Text>

      <Section style={alertBox}>
        <Text style={{ ...urgencyLabel, color: urgencyColor }}>{urgencyText}</Text>
        <Text style={assignmentName}>{assignmentTitle}</Text>
        <Text style={lessonName}>Lesson: {lessonTitle}</Text>
        <Text style={cohortNameStyle}>Cohort: {cohortName}</Text>
        <Hr style={divider} />
        <Text style={dueDateText}>
          <strong>Due:</strong> {dueDate}
        </Text>
        <Text style={timeRemainingText}>
          <strong style={{ color: urgencyColor }}>
            {hoursRemaining <= 1
              ? 'Less than 1 hour remaining'
              : `${hoursRemaining} hours remaining`}
          </strong>
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={assignmentUrl}>
          View Assignment
        </Button>
      </Section>

      <Text style={paragraph}>
        Make sure to submit your work before the deadline to avoid any late penalties.
      </Text>

      <Text style={paragraph}>
        Good luck!
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

const alertBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const urgencyLabel = {
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const assignmentName = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0 0 4px',
};

const lessonName = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 2px',
};

const cohortNameStyle = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};

const dueDateText = {
  fontSize: '14px',
  color: '#334155',
  margin: '0 0 4px',
};

const timeRemainingText = {
  fontSize: '14px',
  color: '#334155',
  margin: '0',
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

export default AssignmentReminderEmail;
