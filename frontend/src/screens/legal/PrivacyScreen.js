import React from 'react';
import { ScrollView } from 'react-native';
import { Screen, Card, Text, Subtle } from '../../ui/components';
import { useTheme } from '../../contexts/ThemeContext';

export default function PrivacyScreen() {
  const { colors, spacing } = useTheme();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing(2) }}>
        <Card>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: spacing(2) }}>Privacy Policy</Text>
          <Text style={{ fontWeight: '600', marginBottom: spacing(1) }}>Last Updated: October 2025</Text>
          
          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Information We Collect</Text>
          <Subtle>
            • Account information (email, encrypted password)
            • Dream journal entries and analysis data
            • Usage patterns and app interactions
            • Device information for app functionality
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>How We Use Your Information</Text>
          <Subtle>
            • Provide AI-powered dream analysis services
            • Improve app functionality and user experience
            • Process payments through secure third-party providers
            • Send important service notifications
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Third-Party Services</Text>
          <Subtle>
            • OpenRouter API: For AI dream analysis (content transmitted securely)
            • Stripe: For payment processing (no card data stored by us)
            • Analytics: Anonymous usage data for app improvement
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Data Security</Text>
          <Subtle>
            • All data encrypted in transit and at rest
            • Secure authentication with JWT tokens
            • Regular security updates and monitoring
            • No sharing of personal data with third parties
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Your Rights</Text>
          <Subtle>
            • Access, modify, or delete your data at any time
            • Export your dream journal data
            • Opt-out of non-essential communications
            • Request data deletion by contacting support
          </Subtle>

          <Text style={{ fontWeight: '600', marginTop: spacing(2), marginBottom: spacing(1) }}>Contact Us</Text>
          <Subtle>
            For privacy questions: privacy@aidreamcatcher.com
          </Subtle>
        </Card>
      </ScrollView>
    </Screen>
  );
}


