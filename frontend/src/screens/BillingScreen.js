import React, { useState, useEffect } from 'react';
import { Alert, Linking, ScrollView, Platform } from 'react-native';
import { Screen, Text, Button, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { useBilling } from '../contexts/BillingContext';
import { getPricing, createCheckoutSession, createBillingPortalSession, cancelSubscription } from '../api';

export default function BillingScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const pricingData = await getPricing();
      setPricing(pricingData);
    } catch (error) {
      console.error('Failed to load pricing:', error);
    }
  };

  const handleUpgrade = async (priceId) => {
    try {
      setLoading(true);
      const { sessionUrl } = await createCheckoutSession(priceId, 7);
      await Linking.openURL(sessionUrl);
    } catch (error) {
      console.error('Checkout failed:', error);
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const { sessionUrl } = await createBillingPortalSession();
      if (!sessionUrl) {
        throw new Error('Missing session URL');
      }
      await Linking.openURL(sessionUrl);
    } catch (error) {
      console.error('Billing portal failed:', error);
      if (error?.response?.status === 404) {
        Alert.alert(
          'No subscription found',
          'It looks like there is no active subscription associated with your account yet.'
        );
      } else {
        Alert.alert('Error', 'Failed to open billing portal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel subscription',
      'Are you sure you want to cancel at the end of the current period?',
      [
        { text: 'No' },
        { text: 'Yes, cancel', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            await cancelSubscription(false);
            Alert.alert('Canceled', 'Your subscription will end at period end.');
            billing?.refresh?.();
          } catch (e) {
            console.error('Cancel failed:', e);
            Alert.alert('Error', 'Failed to cancel subscription.');
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const formatUsage = (usage) => {
    if (!usage) return { dream_create: 0, ai_analyze: 0, chat_message: 0 };
    return {
      dream_create: usage.dream_create || 0,
      ai_analyze: usage.ai_analyze || 0,
      chat_message: usage.chat_message || 0
    };
  };

  const usage = formatUsage(billing?.usage);
  const aiActionsUsed = billing?.getAiActionsUsed?.() || 0;
  const aiActionsLimit = billing?.AI_ACTIONS_LIMIT || 10;

  // If running on iOS, hide web-based billing UI (StoreKit-only policy)
  if (Platform.OS === 'ios') {
    return (
      <Screen style={{ padding: spacing(3) }}>
        <ScrollView>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing(2) }}>
            Subscription
          </Text>
          <Card>
            <Text style={{ color: colors.text, marginBottom: spacing(1) }}>
              In-app purchases are handled by Apple. Please use the App Store subscription settings to manage your plan.
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Restore purchases from the Profile screen if needed.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={{ padding: spacing(3) }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing(3) }}>
          Billing & Subscription
        </Text>

        {/* Current Plan Status */}
        <Card style={{ padding: spacing(3), marginBottom: spacing(3) }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing(2) }}>
            Current Plan
          </Text>
          
          <Text style={{ fontSize: 20, fontWeight: '700', color: billing?.isPremium ? colors.primary : colors.textSecondary, marginBottom: spacing(1) }}>
            {billing?.isPremium ? 'Dream Explorer+' : 'Free Plan'}
          </Text>
          
          {billing?.trial_end && (
            <Text style={{ color: colors.textSecondary, marginBottom: spacing(2) }}>
              Trial ends: {new Date(billing.trial_end).toLocaleDateString()}
            </Text>
          )}

          {billing?.isPremium ? (
            <>
              <Button
                title="Manage Subscription"
                onPress={handleManageSubscription}
                loading={loading}
                style={{ marginTop: spacing(2), marginBottom: spacing(1) }}
              />
              <Button
                title="Cancel Subscription"
                onPress={handleCancel}
                kind="secondary"
              />
            </>
          ) : (
            <Text style={{ color: colors.textSecondary, marginBottom: spacing(2) }}>
              Upgrade to unlock unlimited features
            </Text>
          )}
        </Card>

        {/* Usage Statistics */}
        <Card style={{ padding: spacing(3), marginBottom: spacing(3) }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing(2) }}>
            Usage This Period
          </Text>
          
          {!billing?.isPremium && (
            <>
              <Text style={{ color: colors.text, marginBottom: spacing(1) }}>
                Dreams: {usage.dream_create}/5 this month
              </Text>
              <Text style={{ color: colors.text, marginBottom: spacing(2) }}>
                AI Actions: {aiActionsUsed}/{aiActionsLimit} this month
              </Text>
            </>
          )}
          
          {billing?.isPremium && (
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              ✓ Unlimited usage with Dream Explorer+
            </Text>
          )}
        </Card>

        {/* Pricing Plans */}
        {!billing?.isPremium && pricing && (
          <Card style={{ padding: spacing(3), marginBottom: spacing(3) }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing(2) }}>
              Upgrade Options
            </Text>
            
            {/* Monthly Plan */}
            <Card style={{ padding: spacing(2), marginBottom: spacing(2), backgroundColor: colors.backgroundSecondary }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing(1) }}>
                Monthly Plan
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: spacing(1) }}>
                ${pricing.monthly.price}/month
              </Text>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing(2), fontSize: 12 }}>
                7-day free trial
              </Text>
              
              {pricing.monthly.features.map((feature, index) => (
                <Text key={index} style={{ color: colors.text, marginBottom: spacing(0.5), fontSize: 12 }}>
                  • {feature}
                </Text>
              ))}
              
              <Button
                title="Start Free Trial"
                onPress={() => handleUpgrade('monthly')}
                loading={loading}
                style={{ marginTop: spacing(2) }}
              />
            </Card>

            {/* Yearly Plan */}
            <Card style={{ padding: spacing(2), backgroundColor: colors.backgroundSecondary, borderWidth: 2, borderColor: colors.primary }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing(1) }}>
                Yearly Plan (Best Value)
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: spacing(1) }}>
                ${pricing.yearly.price}/year
              </Text>
              <Text style={{ color: colors.success, marginBottom: spacing(1), fontSize: 12, fontWeight: '600' }}>
                Save {pricing.yearly.savings}%
              </Text>
              <Text style={{ color: colors.textSecondary, marginBottom: spacing(2), fontSize: 12 }}>
                7-day free trial
              </Text>
              
              {pricing.yearly.features.map((feature, index) => (
                <Text key={index} style={{ color: colors.text, marginBottom: spacing(0.5), fontSize: 12 }}>
                  • {feature}
                </Text>
              ))}
              
              <Button
                title="Start Free Trial"
                onPress={() => handleUpgrade('yearly')}
                loading={loading}
                style={{ marginTop: spacing(2), backgroundColor: colors.primary }}
              />
            </Card>
          </Card>
        )}

        {/* Billing Information */}
        <Card style={{ padding: spacing(3), marginBottom: spacing(3) }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing(2) }}>
            Billing Information
          </Text>
          
          <Text style={{ color: colors.textSecondary, marginBottom: spacing(1), fontSize: 12 }}>
            • Cancel anytime during your free trial
          </Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing(1), fontSize: 12 }}>
            • No commitment required
          </Text>
          {Platform.OS !== 'ios' && (
            <Text style={{ color: colors.textSecondary, marginBottom: spacing(1), fontSize: 12 }}>
              • Secure payment processing by Stripe
            </Text>
          )}
          <Text style={{ color: colors.textSecondary, marginBottom: spacing(1), fontSize: 12 }}>
            • Manage subscription anytime in settings
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
