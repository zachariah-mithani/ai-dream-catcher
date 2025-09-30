import React from 'react';
import { ScrollView, View } from 'react-native';
import { Screen, Card, Text, Subtle, Button } from '../../ui/components';
import { useTheme } from '../../contexts/ThemeContext';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const { colors, spacing } = useTheme();
  const version = Constants?.expoConfig?.version || '1.0.0';
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing(2) }}>
        <Card>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: spacing(2) }}>About</Text>
          <Subtle style={{ marginBottom: spacing(1) }}>AI Dream Catcher</Subtle>
          <Subtle style={{ marginBottom: spacing(2) }}>Version {version}</Subtle>
          <Subtle>
            This app helps you log and analyze dreams, discover patterns, and chat with an AI
            analyst to explore meaning and symbols.
          </Subtle>
        </Card>
      </ScrollView>
    </Screen>
  );
}


