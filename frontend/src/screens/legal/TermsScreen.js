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
          <Subtle>
            By using AI Dream Catcher you agree to our acceptable use, content, and privacy
            standards. This app is provided as-is without warranty. Do not log illegal or harmful
            content. We may update these terms.
          </Subtle>
        </Card>
      </ScrollView>
    </Screen>
  );
}


