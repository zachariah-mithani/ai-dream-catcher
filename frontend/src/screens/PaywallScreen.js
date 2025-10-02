import React from 'react';
import { Screen, Text, Button, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { upgradePlan } from '../api';
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
              console.log('PaywallScreen: Starting upgrade to premium with 7-day trial...');
              const result = await upgradePlan('premium', 7);
              console.log('PaywallScreen: Upgrade result:', result);
            } catch (e) {
              console.error('PaywallScreen: Upgrade failed:', e);
            }
            console.log('PaywallScreen: Refreshing billing context...');
            await billing?.refresh?.();
            console.log('PaywallScreen: Navigating back to settings...');
            navigation.goBack();
          }} 
          style={{ marginBottom: spacing(1) }} 
        />
        <Button 
          title="Continue Free (limited)" 
          onPress={async () => { 
            try { 
              await upgradePlan('free'); 
            } catch (e) {
              console.error('Downgrade failed:', e);
            }
            await billing?.refresh?.();
            navigation.goBack();
          }} 
          kind="secondary" 
        />
      </Card>
    </Screen>
  );
}


