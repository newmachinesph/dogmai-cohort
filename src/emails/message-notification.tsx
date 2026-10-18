import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface MessageNotificationEmailProps {
  recipientName: string;
  senderName: string;
  senderAvatar?: string;
  messagePreview: string;
  conversationName?: string;
  isGroupMessage: boolean;
  sentAt: string;
  conversationUrl: string;
  unreadCount?: number;
}

export function MessageNotificationEmail({
  recipientName = 'Student',
  senderName = 'John Doe',
  messagePreview = 'Hey! Just wanted to check in about the assignment...',
  conversationName,
  isGroupMessage = false,
  sentAt = 'January 15, 2024 at 10:00 AM',
  conversationUrl = 'https://dogm.ai/messages/1',
  unreadCount = 1,
}: MessageNotificationEmailProps) {
  const title = isGroupMessage
    ? `New message in ${conversationName || 'group chat'}`
    : `New message from ${senderName}`;

  return (
    <BaseLayout previewText={`${senderName}: ${messagePreview.substring(0, 50)}...`}>
      <Heading style={heading}>{title}</Heading>

      <Text style={paragraph}>Hi {recipientName},</Text>

      <Text style={paragraph}>
        You have {unreadCount === 1 ? 'a new message' : `${unreadCount} new messages`} waiting for you.
      </Text>

      <Section style={messageCard}>
        <Section style={messageHeader}>
          <Section style={senderInfo}>
            <Section style={avatarPlaceholder}>
              <Text style={avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
            </Section>
            <Section style={senderDetails}>
              <Text style={senderNameText}>{senderName}</Text>
              <Text style={sentAtText}>{sentAt}</Text>
            </Section>
          </Section>
        </Section>

        <Hr style={divider} />

        <Text style={messageText}>{messagePreview}</Text>

        {isGroupMessage && conversationName && (
          <Text style={groupLabel}>
            in <strong>{conversationName}</strong>
          </Text>
        )}
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={conversationUrl}>
          Reply to Message
        </Button>
      </Section>

      <Text style={paragraph}>
        Don&apos;t keep them waiting - reply now to continue the conversation!
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

const messageCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const messageHeader = {
  marginBottom: '0',
};

const senderInfo = {
  display: 'flex',
  alignItems: 'center',
};

const avatarPlaceholder = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: '#2563eb',
  display: 'inline-block',
  textAlign: 'center' as const,
  lineHeight: '40px',
  marginRight: '12px',
};

const avatarText = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '40px',
};

const senderDetails = {
  display: 'inline-block',
  verticalAlign: 'top',
};

const senderNameText = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#0f172a',
  margin: '0',
};

const sentAtText = {
  fontSize: '13px',
  color: '#64748b',
  margin: '2px 0 0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};

const messageText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#334155',
  margin: '0',
  backgroundColor: '#ffffff',
  padding: '12px',
  borderRadius: '8px',
  borderLeft: '3px solid #2563eb',
};

const groupLabel = {
  fontSize: '13px',
  color: '#64748b',
  margin: '12px 0 0',
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

export default MessageNotificationEmail;
