import React from 'react';
import { Screen, Text, Button, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';
import { useBilling } from '../contexts/BillingContext';

export default function PaywallScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  return (
    <Screen style={{ padding: spacing(3) }}>
      <Card style={{ padding: spacing(3) }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing(2) }}>
          Unlock deeper meaning in your dreams
        </Text>
        <Text style={{ color: colors.text, marginBottom: spacing(1) }}>• Unlimited entries & edits</Text>
        <Text style={{ color: colors.text, marginBottom: spacing(1) }}>• Advanced AI interpretations</Text>
        <Text style={{ color: colors.text, marginBottom: spacing(1) }}>• Mood ↔ dream correlations</Text>
        <Text style={{ color: colors.text, marginBottom: spacing(1) }}>• Unlimited Dream Analyst chat</Text>
        <Text style={{ color: colors.text, marginBottom: spacing(3) }}>• Full history & trends</Text>
        <Button 
          title="Start 7-day free trial" 
          onPress={async () => {
            try {
              const res = await api.post('/billing/upgrade', { plan: 'premium', trial_days: 7 });
            } catch (e) {}
            await billing?.refresh?.();
            navigation.goBack();
          }} 
          style={{ marginBottom: spacing(1) }} 
        />
        <Button 
          title="Continue Free (limited)" 
          onPress={async () => { 
            try { await api.post('/billing/upgrade', { plan: 'free' }); } catch {}
            await billing?.refresh?.();
            navigation.goBack();
          }} 
          kind="secondary" 
        />
      </Card>
    </Screen>
  );
}


