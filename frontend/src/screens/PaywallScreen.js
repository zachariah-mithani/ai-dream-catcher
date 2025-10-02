import React from 'react';
import { Alert } from 'react-native';
import { Screen, Text, Button, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { upgradePlan } from '../api';
import { useBilling } from '../contexts/BillingContext';

export default function PaywallScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  
  // If user is already premium, show different content
  if (billing?.isPremium) {
    return (
      <Screen style={{ padding: spacing(3) }}>
        <Card style={{ padding: spacing(3) }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing(2) }}>
            Dream Explorer+ Active
          </Text>
          <Text style={{ color: colors.text, marginBottom: spacing(1) }}>✓ Unlimited entries & edits</Text>
          <Text style={{ color: colors.text, marginBottom: spacing(1) }}>✓ Advanced AI interpretations</Text>
          <Text style={{ color: colors.text, marginBottom: spacing(1) }}>✓ Mood ↔ dream correlations</Text>
          <Text style={{ color: colors.text, marginBottom: spacing(1) }}>✓ Unlimited Dream Analyst chat</Text>
          <Text style={{ color: colors.text, marginBottom: spacing(3) }}>✓ Full history & trends</Text>
          
          <Text style={{ color: colors.textSecondary, marginBottom: spacing(2), textAlign: 'center' }}>
            You're currently on the Dream Explorer+ plan
          </Text>
          
          <Button 
            title="Switch to Free Plan" 
            onPress={async () => {
              try {
                console.log('PaywallScreen: Switching to free plan...');
                await upgradePlan('free');
                await billing?.refresh?.();
                Alert.alert('Success', 'Switched to Free plan.');
                navigation.goBack();
              } catch (e) {
                console.error('PaywallScreen: Switch to free failed:', e);
                Alert.alert('Error', 'Failed to switch plan. Please try again.');
              }
            }} 
            kind="secondary"
            style={{ marginBottom: spacing(1) }} 
          />
          <Button 
            title="Keep Dream Explorer+" 
            onPress={() => navigation.goBack()} 
            style={{ backgroundColor: colors.primary }}
          />
        </Card>
      </Screen>
    );
  }
  
  // Free user - show upgrade options
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


