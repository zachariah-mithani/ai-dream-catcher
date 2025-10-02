import React, { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { Screen, Text, Button, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { upgradePlan, createCheckoutSession, createBillingPortalSession } from '../api';
import { useBilling } from '../contexts/BillingContext';

export default function PaywallScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  const [loading, setLoading] = useState(false);
  
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
            title="Manage Subscription" 
            onPress={async () => {
              try {
                setLoading(true);
                const { sessionUrl } = await createBillingPortalSession();
                await Linking.openURL(sessionUrl);
              } catch (e) {
                console.error('PaywallScreen: Billing portal failed:', e);
                Alert.alert('Error', 'Failed to open billing portal. Please try again.');
              } finally {
                setLoading(false);
              }
            }} 
            kind="secondary"
            style={{ marginBottom: spacing(1) }} 
            loading={loading}
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
          title="Start 7-day free trial - $9.99/month" 
          onPress={async () => {
            try {
              setLoading(true);
              console.log('PaywallScreen: Creating Stripe checkout session...');
              const { sessionUrl } = await createCheckoutSession('monthly', 7);
              await Linking.openURL(sessionUrl);
            } catch (e) {
              console.error('PaywallScreen: Checkout failed:', e);
              Alert.alert('Error', 'Failed to start checkout. Please try again.');
            } finally {
              setLoading(false);
            }
          }} 
          style={{ marginBottom: spacing(1) }} 
          loading={loading}
        />
        <Button 
          title="Save 17% - $99.99/year" 
          onPress={async () => {
            try {
              setLoading(true);
              console.log('PaywallScreen: Creating yearly Stripe checkout session...');
              const { sessionUrl } = await createCheckoutSession('yearly', 7);
              await Linking.openURL(sessionUrl);
            } catch (e) {
              console.error('PaywallScreen: Yearly checkout failed:', e);
              Alert.alert('Error', 'Failed to start checkout. Please try again.');
            } finally {
              setLoading(false);
            }
          }} 
          kind="secondary"
          style={{ marginBottom: spacing(1) }}
          loading={loading}
        />
        <Button 
          title="Continue Free (limited)" 
          onPress={() => navigation.goBack()} 
          kind="tertiary"
        />
      </Card>
    </Screen>
  );
}


