import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface GradeNotificationEmailProps {
  studentName: string;
  assignmentTitle: string;
  lessonTitle: string;
  cohortName: string;
  grade: number;
  maxGrade: number;
  percentage: number;
  feedback?: string;
  gradedBy: string;
  assignmentUrl: string;
}

export function GradeNotificationEmail({
  studentName = 'Student',
  assignmentTitle = 'Week 1 Assignment',
  lessonTitle = 'Introduction to the Course',
  cohortName = 'Spring 2024 Cohort',
  grade = 85,
  maxGrade = 100,
  percentage = 85,
  feedback,
  gradedBy = 'Instructor',
  assignmentUrl = 'https://dogm.ai/student/assignments/1',
}: GradeNotificationEmailProps) {
  const getGradeColor = (pct: number) => {
    if (pct >= 90) return '#16a34a';
    if (pct >= 80) return '#2563eb';
    if (pct >= 70) return '#f59e0b';
    if (pct >= 60) return '#ea580c';
    return '#dc2626';
  };

  const getGradeLetter = (pct: number) => {
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 67) return 'D+';
    if (pct >= 63) return 'D';
    if (pct >= 60) return 'D-';
    return 'F';
  };

  const gradeColor = getGradeColor(percentage);
  const gradeLetter = getGradeLetter(percentage);

  return (
    <BaseLayout previewText={`Your grade for ${assignmentTitle}: ${grade}/${maxGrade} (${percentage}%)`}>
      <Heading style={heading}>Assignment Graded</Heading>

      <Text style={paragraph}>Hi {studentName},</Text>

      <Text style={paragraph}>
        Great news! Your assignment has been graded. Here are your results:
      </Text>

      <Section style={gradeCard}>
        <Text style={assignmentName}>{assignmentTitle}</Text>
        <Text style={lessonName}>Lesson: {lessonTitle}</Text>
        <Text style={cohortNameStyle}>Cohort: {cohortName}</Text>

        <Hr style={divider} />

        <Section style={gradeDisplay}>
          <Text style={{ ...gradeNumber, color: gradeColor }}>
            {grade}/{maxGrade}
          </Text>
          <Text style={{ ...gradePercentage, color: gradeColor }}>
            {percentage}% ({gradeLetter})
          </Text>
        </Section>

        {feedback && (
          <>
            <Hr style={divider} />
            <Text style={feedbackLabel}>Instructor Feedback:</Text>
            <Text style={feedbackText}>{feedback}</Text>
          </>
        )}

        <Hr style={divider} />
        <Text style={gradedByText}>Graded by: {gradedBy}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={assignmentUrl}>
          View Full Details
        </Button>
      </Section>

      <Text style={paragraph}>
        Keep up the great work! If you have any questions about your grade,
        please reach out to your instructor.
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

const gradeCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
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

const gradeDisplay = {
  textAlign: 'center' as const,
  padding: '16px 0',
};

const gradeNumber = {
  fontSize: '36px',
  fontWeight: '700',
  margin: '0',
  lineHeight: '1.2',
};

const gradePercentage = {
  fontSize: '18px',
  fontWeight: '500',
  margin: '4px 0 0',
};

const feedbackLabel = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const feedbackText = {
  fontSize: '14px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0',
  fontStyle: 'italic' as const,
  backgroundColor: '#ffffff',
  padding: '12px',
  borderRadius: '4px',
  borderLeft: '3px solid #2563eb',
};

const gradedByText = {
  fontSize: '13px',
  color: '#64748b',
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

export default GradeNotificationEmail;
