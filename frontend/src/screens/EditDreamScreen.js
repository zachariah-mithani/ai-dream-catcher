import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Card, Text, Input, Button } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { updateDream } from '../api';

export default function EditDreamScreen({ route, navigation }) {
  const { colors, spacing } = useTheme();
  const { dream } = route.params;
  const [title, setTitle] = useState(dream.title || '');
  const [content, setContent] = useState(dream.content || '');
  const [saving, setSaving] = useState(false);

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
        <Input
          placeholder="Title (optional)"
          value={title}
          onChangeText={setTitle}
          style={{ marginBottom: spacing(2) }}
        />
        <Input
          placeholder="Write your dream..."
          value={content}
          onChangeText={setContent}
          multiline
          style={{ height: 180, textAlignVertical: 'top', marginBottom: spacing(2) }}
        />
        <Button title={saving ? 'Saving...' : 'Save Changes'} onPress={onSave} disabled={saving} />
      </Card>
    </Screen>
  );
}


