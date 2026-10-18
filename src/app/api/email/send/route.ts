import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import {
  sendAssignmentReminder,
  sendGradeNotification,
  sendAnnouncementEmail,
  sendMessageNotification,
  sendWelcomeEmail,
  sendWeeklyDigest,
} from '@/lib/email-service';

// POST /api/email/send - Send emails (staff/admin only for most types)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...params } = body;

    // Validate email type
    const validTypes = [
      'assignment-reminder',
      'grade-notification',
      'announcement',
      'message-notification',
      'welcome',
      'weekly-digest',
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // Check permissions (staff/admin for most email types)
    const requiresStaff = ['announcement', 'welcome', 'assignment-reminder'];
    if (requiresStaff.includes(type) && user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let result;

    switch (type) {
      case 'assignment-reminder':
        result = await sendAssignmentReminder({
          to: params.to,
          studentName: params.studentName,
          assignmentTitle: params.assignmentTitle,
          lessonTitle: params.lessonTitle,
          cohortName: params.cohortName,
          dueDate: params.dueDate,
          hoursRemaining: params.hoursRemaining,
          assignmentUrl: params.assignmentUrl,
        });
        break;

      case 'grade-notification':
        result = await sendGradeNotification({
          to: params.to,
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
        });
        break;

      case 'announcement':
        result = await sendAnnouncementEmail({
          to: params.to,
          recipientName: params.recipientName,
          announcementTitle: params.announcementTitle,
          announcementContent: params.announcementContent,
          authorName: params.authorName,
          authorRole: params.authorRole,
          cohortName: params.cohortName,
          postedAt: params.postedAt,
          announcementUrl: params.announcementUrl,
          priority: params.priority,
        });
        break;

      case 'message-notification':
        result = await sendMessageNotification({
          to: params.to,
          recipientName: params.recipientName,
          senderName: params.senderName,
          messagePreview: params.messagePreview,
          conversationName: params.conversationName,
          isGroupMessage: params.isGroupMessage,
          sentAt: params.sentAt,
          conversationUrl: params.conversationUrl,
          unreadCount: params.unreadCount,
        });
        break;

      case 'welcome':
        result = await sendWelcomeEmail({
          to: params.to,
          userName: params.userName,
          userEmail: params.userEmail,
          role: params.role,
          cohortName: params.cohortName,
          loginUrl: params.loginUrl,
          temporaryPassword: params.temporaryPassword,
        });
        break;

      case 'weekly-digest':
        result = await sendWeeklyDigest({
          to: params.to,
          recipientName: params.recipientName,
          weekRange: params.weekRange,
          upcomingAssignments: params.upcomingAssignments,
          recentGrades: params.recentGrades,
          unreadMessages: params.unreadMessages,
          announcements: params.announcements,
          dashboardUrl: params.dashboardUrl,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    if (!result.success) {
      console.error('Email sending failed:', result.error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
