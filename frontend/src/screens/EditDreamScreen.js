import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Screen, Card, Text, Input, Button } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { useBilling } from '../contexts/BillingContext';
import { updateDream } from '../api';

export default function EditDreamScreen({ route, navigation }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  const { dream } = route.params;
  const [title, setTitle] = useState(dream.title || '');
  const [content, setContent] = useState(dream.content || '');
  const [saving, setSaving] = useState(false);

  // Check if dream can be edited (7-day limit for free users)
  const canEdit = billing?.canUse('dream_edit', dream);
  const isWithinEditWindow = () => {
    if (billing?.isPremium) return true;
    if (!dream.created_at) return true; // Allow if no creation date
    
    const creationDate = new Date(dream.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return creationDate > sevenDaysAgo;
  };

  const onSave = async () => {
    if (!content.trim()) {
      Alert.alert('Missing content', 'Please enter your dream content.');
      return;
    }
    setSaving(true);
    try {
      await updateDream(dream.id, {
        title: title.trim() || undefined,
        content: content.trim(),
      });
      Alert.alert('Saved', 'Your dream was updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to update dream.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing(2) }}>Edit Dream</Text>
        
        {!isWithinEditWindow() && !billing?.isPremium && (
          <Card style={{ 
            backgroundColor: colors.surface, 
            borderWidth: 1, 
            borderColor: colors.border,
            marginBottom: spacing(2)
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16, flex: 1 }}>Edit Time Expired</Text>
              <View style={{ backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                <Text style={{ color: colors.primaryText, fontSize: 10, fontWeight: '600' }}>PREMIUM</Text>
              </View>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 12 }}>
              Free users can only edit dreams within 7 days of creation. Upgrade to edit anytime!
            </Text>
            <Button 
              title="Upgrade to Dream Explorer+"
              onPress={() => navigation.navigate('Paywall')}
              style={{ backgroundColor: colors.primary }}
            />
          </Card>
        )}

        <Input
          placeholder="Title (optional)"
          value={title}
          onChangeText={setTitle}
          style={{ marginBottom: spacing(2) }}
          editable={isWithinEditWindow() || billing?.isPremium}
        />
        <Input
          placeholder="Write your dream..."
          value={content}
          onChangeText={setContent}
          multiline
          style={{ 
            height: 180, 
            textAlignVertical: 'top', 
            marginBottom: spacing(2),
            opacity: (isWithinEditWindow() || billing?.isPremium) ? 1 : 0.5
          }}
          editable={isWithinEditWindow() || billing?.isPremium}
        />
        <Button 
          title={saving ? 'Saving...' : 'Save Changes'} 
          onPress={onSave} 
          disabled={saving || (!isWithinEditWindow() && !billing?.isPremium)}
          style={{
            backgroundColor: (isWithinEditWindow() || billing?.isPremium) ? colors.primary : colors.buttonDisabled
          }}
        />
      </Card>
    </Screen>
  );
}


