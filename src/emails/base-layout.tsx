import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BaseLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function BaseLayout({ previewText, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>DOGM.AI</Text>
            <Text style={tagline}>Cohort Management Platform</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by DOGM.AI Cohort Management Platform.
            </Text>
            <Text style={footerText}>
              <Link href="https://dogm.ai" style={link}>
                Visit DOGM.AI
              </Link>
              {' | '}
              <Link href="https://dogm.ai/settings/notifications" style={link}>
                Manage Notifications
              </Link>
            </Text>
            <Text style={copyright}>
              © {new Date().getFullYear()} DOGM.AI. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 48px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
};

const logoText = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0',
  letterSpacing: '-0.5px',
};

const tagline = {
  fontSize: '14px',
  color: '#64748b',
  margin: '4px 0 0',
};

const content = {
  padding: '32px 48px',
};

const footer = {
  padding: '24px 48px',
  backgroundColor: '#f8fafc',
  borderTop: '1px solid #e6ebf1',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#64748b',
  margin: '0 0 8px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'none',
};

const copyright = {
  fontSize: '11px',
  color: '#94a3b8',
  margin: '16px 0 0',
};

export default BaseLayout;
