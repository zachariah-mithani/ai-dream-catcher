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
          <Subtle>
            We store your account and dream data to provide the service. Your data is not sold.
            You may delete your account at any time from Settings. We use third-party AI APIs to
            process analysis; only necessary content is transmitted.
          </Subtle>
        </Card>
      </ScrollView>
    </Screen>
  );
}


