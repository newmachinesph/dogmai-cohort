import { render } from '@react-email/components';
import { sendEmail } from './email';
import {
  AssignmentReminderEmail,
  GradeNotificationEmail,
  AnnouncementEmail,
  MessageNotificationEmail,
  WelcomeEmail,
  WeeklyDigestEmail,
} from '@/emails';

// Assignment Reminder
export async function sendAssignmentReminder(params: {
  to: string;
  studentName: string;
  assignmentTitle: string;
  lessonTitle: string;
  cohortName: string;
  dueDate: string;
  hoursRemaining: number;
  assignmentUrl: string;
}) {
  const html = await render(
    AssignmentReminderEmail({
      studentName: params.studentName,
      assignmentTitle: params.assignmentTitle,
      lessonTitle: params.lessonTitle,
      cohortName: params.cohortName,
      dueDate: params.dueDate,
      hoursRemaining: params.hoursRemaining,
      assignmentUrl: params.assignmentUrl,
    })
  );

  return sendEmail({
    to: params.to,
    subject: `📚 Reminder: ${params.assignmentTitle} is due soon`,
    html,
  });
}

// Grade Notification
export async function sendGradeNotification(params: {
  to: string;
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
}) {
  const html = await render(
    GradeNotificationEmail({
      studentName: params.studentName,
      assignmentTitle: params.assignmentTitle,
      lessonTitle: params.lessonTitle,
      cohortName: params.cohortName,
      grade: params.grade,
      maxGrade: params.maxGrade,
      percentage: params.percentage,
      feedback: params.feedback,
      gradedBy: params.gradedBy,
      assignmentUrl: params.assignmentUrl,
    })
  );

  return sendEmail({
    to: params.to,
    subject: `📊 Your grade for ${params.assignmentTitle}: ${params.grade}/${params.maxGrade}`,
    html,
  });
}

// Announcement
export async function sendAnnouncementEmail(params: {
  to: string | string[];
  recipientName: string;
  announcementTitle: string;
  announcementContent: string;
  authorName: string;
  authorRole: string;
  cohortName?: string;
  postedAt: string;
  announcementUrl: string;
  priority?: 'normal' | 'important' | 'urgent';
}) {
  const html = await render(
    AnnouncementEmail({
      recipientName: params.recipientName,
      announcementTitle: params.announcementTitle,
      announcementContent: params.announcementContent,
      authorName: params.authorName,
      authorRole: params.authorRole,
      cohortName: params.cohortName,
      postedAt: params.postedAt,
      announcementUrl: params.announcementUrl,
      priority: params.priority,
    })
  );

  const priorityPrefix = params.priority === 'urgent' ? '🚨 ' : params.priority === 'important' ? '⚠️ ' : '';

  return sendEmail({
    to: params.to,
    subject: `${priorityPrefix}📢 ${params.announcementTitle}`,
    html,
  });
}

// Message Notification
export async function sendMessageNotification(params: {
  to: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationName?: string;
  isGroupMessage: boolean;
  sentAt: string;
  conversationUrl: string;
  unreadCount?: number;
}) {
  const html = await render(
    MessageNotificationEmail({
      recipientName: params.recipientName,
      senderName: params.senderName,
      messagePreview: params.messagePreview,
      conversationName: params.conversationName,
      isGroupMessage: params.isGroupMessage,
      sentAt: params.sentAt,
      conversationUrl: params.conversationUrl,
      unreadCount: params.unreadCount,
    })
  );

  const subject = params.isGroupMessage
    ? `💬 New message in ${params.conversationName || 'group'} from ${params.senderName}`
    : `💬 New message from ${params.senderName}`;

  return sendEmail({
    to: params.to,
    subject,
    html,
  });
}

// Welcome Email
export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
  userEmail: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  cohortName?: string;
  loginUrl: string;
  temporaryPassword?: string;
}) {
  const html = await render(
    WelcomeEmail({
      userName: params.userName,
      userEmail: params.userEmail,
      role: params.role,
      cohortName: params.cohortName,
      loginUrl: params.loginUrl,
      temporaryPassword: params.temporaryPassword,
    })
  );

  return sendEmail({
    to: params.to,
    subject: `🎉 Welcome to DOGM.AI, ${params.userName}!`,
    html,
  });
}

// Weekly Digest
export async function sendWeeklyDigest(params: {
  to: string;
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
}) {
  const html = await render(
    WeeklyDigestEmail({
      recipientName: params.recipientName,
      weekRange: params.weekRange,
      upcomingAssignments: params.upcomingAssignments,
      recentGrades: params.recentGrades,
      unreadMessages: params.unreadMessages,
      announcements: params.announcements,
      dashboardUrl: params.dashboardUrl,
    })
  );

  return sendEmail({
    to: params.to,
    subject: `📅 Your DOGM.AI Weekly Digest - ${params.weekRange}`,
    html,
  });
}
