import React from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { Text, Button, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { useBilling } from '../contexts/BillingContext';
import { useIAP } from '../contexts/IAPService';
import { createCheckoutSession } from '../api';

export default function UpgradePrompt({ 
  visible, 
  onClose, 
  limitType, 
  currentUsage, 
  limit, 
  period = 'month' 
}) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  const iap = useIAP();

  if (!visible) return null;

  const getLimitMessage = () => {
    const periodText = period === 'day' ? 'today' : 'this month';
    switch (limitType) {
      case 'dream_create':
        return `You've reached your limit of ${limit} dream entries ${periodText}.`;
      case 'ai_analyze':
        return `You've reached your limit of ${limit} AI analyses ${periodText}.`;
      case 'chat_message':
        return `You've reached your limit of ${limit} chat messages ${periodText}.`;
      default:
        return `You've reached your usage limit ${periodText}.`;
    }
  };

  const getUpgradeMessage = () => {
    switch (limitType) {
      case 'dream_create':
        return 'Upgrade to Dream Explorer+ for unlimited dream entries and advanced features.';
      case 'ai_analyze':
        return 'Upgrade to Dream Explorer+ for unlimited AI analysis and deeper insights.';
      case 'chat_message':
        return 'Upgrade to Dream Explorer+ for unlimited chat with the Dream Analyst.';
      default:
        return 'Upgrade to Dream Explorer+ for unlimited access to all features.';
    }
  };

  const handleUpgrade = async (priceId) => {
    if (Platform.OS === 'ios') {
      try {
        const productId = priceId === 'monthly' ? 'com.aidreamcatcher.premium.monthly' : 'com.aidreamcatcher.premium.yearly';
        await iap.requestPurchase(productId);
        onClose?.();
      } catch (error) {
        console.error('IAP upgrade failed:', error);
        Alert.alert('Error', 'Failed to start upgrade. Please try again.');
      }
      return;
    }

    try {
      const { sessionUrl } = await createCheckoutSession(priceId, 7);
      await Linking.openURL(sessionUrl);
      onClose?.();
    } catch (error) {
      console.error('Upgrade failed:', error);
      Alert.alert('Error', 'Failed to start upgrade. Please try again.');
    }
  };

  return (
    <Card style={{ 
      padding: spacing(3), 
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.primary,
      margin: spacing(2)
    }}>
      <Text style={{ 
        fontSize: 16, 
        fontWeight: '600', 
        color: colors.text, 
        marginBottom: spacing(2),
        textAlign: 'center'
      }}>
        Limit Reached
      </Text>
      
      <Text style={{ 
        color: colors.textSecondary, 
        marginBottom: spacing(2),
        textAlign: 'center'
      }}>
        {getLimitMessage()}
      </Text>
      
      <Text style={{ 
        color: colors.text, 
        marginBottom: spacing(3),
        textAlign: 'center',
        fontSize: 14
      }}>
        {getUpgradeMessage()}
      </Text>

      <Text style={{ 
        color: colors.textSecondary, 
        marginBottom: spacing(2),
        textAlign: 'center',
        fontSize: 12
      }}>
        Current usage: {currentUsage}/{limit} {period === 'day' ? 'today' : 'this month'}
      </Text>

      <Button
        title="Start 7-day free trial - $9.99/month"
        onPress={() => handleUpgrade('monthly')}
        style={{ marginBottom: spacing(1) }}
      />
      
      <Button
        title="Save 17% - $99.99/year"
        onPress={() => handleUpgrade('yearly')}
        kind="secondary"
        style={{ marginBottom: spacing(1) }}
      />
      
      <Button
        title="Maybe later"
        onPress={onClose}
        kind="tertiary"
      />
    </Card>
  );
}

export function InlineUpgradePrompt({ limitType, currentUsage, limit, period = 'month' }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  const iap = useIAP();

  const getMessage = () => {
    const periodText = period === 'day' ? 'today' : 'this month';
    // If unified AI actions display requested, use combined counter
    if (limitType === 'ai_actions') {
      const remainingAi = billing?.getAiActionsRemaining?.() ?? 0;
      return `${remainingAi} AI actions remaining ${periodText}`;
    }
    const remaining = Math.max(0, limit - currentUsage);
    
    if (remaining === 0) {
      switch (limitType) {
        case 'dream_create':
          return `You've used all ${limit} dream entries ${periodText}.`;
        case 'ai_analyze':
          return `You've used all ${limit} AI analyses ${periodText}.`;
        case 'chat_message':
          return `You've used all ${limit} chat messages ${periodText}.`;
        default:
          return `You've reached your limit ${periodText}.`;
      }
    }
    
    return `${remaining} ${limitType.replace('_', ' ')} remaining ${periodText}`;
  };

  const getUpgradeText = () => {
    const remaining = Math.max(0, limit - currentUsage);
    if (remaining === 0) {
      return 'Upgrade for unlimited access';
    }
    return 'Upgrade for unlimited access';
  };

  const handleUpgrade = async () => {
    if (Platform.OS === 'ios') {
      try {
        await iap.requestPurchase('com.aidreamcatcher.premium.monthly');
      } catch (error) {
        console.error('IAP upgrade failed:', error);
        Alert.alert('Error', 'Failed to start upgrade. Please try again.');
      }
      return;
    }

    try {
      const { sessionUrl } = await createCheckoutSession('monthly', 7);
      await Linking.openURL(sessionUrl);
    } catch (error) {
      console.error('Upgrade failed:', error);
      Alert.alert('Error', 'Failed to start upgrade. Please try again.');
    }
  };

  return (
    <Card style={{ 
      padding: spacing(2), 
      backgroundColor: colors.backgroundSecondary,
      margin: spacing(1)
    }}>
      <Text style={{ 
        color: colors.textSecondary, 
        marginBottom: spacing(1),
        fontSize: 12
      }}>
        {getMessage()}
      </Text>
      
      <View style={{ flexDirection: 'row', gap: spacing(1) }}>
        <Button
          title="Monthly $4.99"
          onPress={() => {
            if (Platform.OS === 'ios') {
              iap.requestPurchase('com.aidreamcatcher.premium.monthly').catch(console.error);
            } else {
              handleUpgrade();
            }
          }}
          kind="secondary"
          style={{ flex: 1, paddingVertical: spacing(1) }}
        />
        <Button
          title="Yearly $39.99"
          onPress={() => {
            if (Platform.OS === 'ios') {
              iap.requestPurchase('com.aidreamcatcher.premium.yearly').catch(console.error);
            } else {
              createCheckoutSession('yearly', 7).then(({ sessionUrl }) => 
                Linking.openURL(sessionUrl)
              ).catch(console.error);
            }
          }}
          kind="secondary"
          style={{ flex: 1, paddingVertical: spacing(1) }}
        />
      </View>
    </Card>
  );
}
