import React from 'react';
import { ScrollView } from 'react-native';
import { Screen, Card, Text, Subtle } from '../../ui/components';
import { useTheme } from '../../contexts/ThemeContext';

export default function TermsScreen() {
  const { colors, spacing } = useTheme();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing(2) }}>
        <Card>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: spacing(2) }}>Terms of Service</Text>
          <Text style={{ fontWeight: '600', marginBottom: spacing(1) }}>Last Updated: October 2025</Text>
          
          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Acceptance of Terms</Text>
          <Subtle>
            By downloading, installing, or using AI Dream Catcher, you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Service Description</Text>
          <Subtle>
            AI Dream Catcher is a dream journaling application that provides AI-powered analysis and pattern tracking to help users understand their dreams and subconscious patterns.
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>User Responsibilities</Text>
          <Subtle>
            • Provide accurate account information
            • Use the service for personal, non-commercial purposes
            • Respect intellectual property rights
            • Do not share account credentials
            • Report any security vulnerabilities
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Prohibited Content</Text>
          <Subtle>
            • Illegal, harmful, or threatening content
            • Harassment, abuse, or hate speech
            • Spam or unsolicited content
            • Attempts to circumvent security measures
            • Commercial use without permission
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Subscription & Billing</Text>
          <Subtle>
            • Free tier includes limited usage
            • Premium subscriptions auto-renew unless cancelled
            • Refunds subject to platform policies
            • Price changes will be communicated in advance
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Privacy & Data</Text>
          <Subtle>
            Your privacy is important to us. Please review our Privacy Policy for details on data collection, use, and protection.
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Service Availability</Text>
          <Subtle>
            We strive for 99% uptime but cannot guarantee uninterrupted service. We may perform maintenance that temporarily affects availability.
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Limitation of Liability</Text>
          <Subtle>
            AI Dream Catcher is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages.
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Changes to Terms</Text>
          <Subtle>
            We may update these terms periodically. Continued use after changes constitutes acceptance of new terms.
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Contact Information</Text>
          <Subtle>
            Questions about these terms: legal@aidreamcatcher.com
          </Subtle>
        </Card>
      </ScrollView>
    </Screen>
  );
}


