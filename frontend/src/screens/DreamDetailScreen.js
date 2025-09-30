import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Screen, Text, Card, Subtle, Button } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { analyzeDream } from '../api';

export default function DreamDetailScreen({ route }) {
  const { item } = route.params;
  const [analysis, setAnalysis] = useState(item.analysis || null);
  const [busy, setBusy] = useState(false);
  const { colors, spacing } = useTheme();

  const runAnalysis = async () => {
    setBusy(true);
    try {
      const text = await analyzeDream(item);
      setAnalysis(text);
    } catch (e) {
      Alert.alert('Error', 'AI analysis failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(2) }}>
        <Card style={{ marginBottom: spacing(2) }}>
          <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: spacing(1) }}>
            {item.title || 'Untitled Dream'}
          </Text>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
            {item.content}
          </Text>
          
          {(item.mood || item.tags) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(2) }}>
              {item.mood && (
                <View style={{ 
                  backgroundColor: colors.primary, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 16, 
                  marginRight: 8, 
                  marginBottom: 8 
                }}>
                  <Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '600' }}>{item.mood}</Text>
                </View>
              )}
              {item.tags && JSON.parse(item.tags).map((tag, index) => (
                <View key={index} style={{ 
                  backgroundColor: colors.accent, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 16, 
                  marginRight: 8, 
                  marginBottom: 8 
                }}>
                  <Text style={{ color: colors.primaryText, fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          
          <Subtle style={{ marginTop: spacing(1) }}>
            {new Date(item.created_at).toLocaleDateString()}
          </Subtle>
        </Card>

        {!analysis && (
          <Card style={{ marginBottom: spacing(2) }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: spacing(1) }}>
              AI Analysis
            </Text>
            <Text style={{ color: colors.subtext, marginBottom: spacing(2) }}>
              Get AI-powered insights into your dream's meaning and symbolism.
            </Text>
            <Button
              title={busy ? 'Analyzing...' : 'Analyze with AI'}
              onPress={runAnalysis}
              disabled={busy}
              style={{ 
                paddingVertical: spacing(2)
              }}
            />
            {busy && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing(1) }}>
                <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: spacing(1) }} />
                <Subtle>AI is analyzing your dream...</Subtle>
              </View>
            )}
          </Card>
        )}

        {analysis && (
          <Card style={{ marginBottom: spacing(2) }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
              AI Analysis
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
              {analysis}
            </Text>
            <TouchableOpacity onPress={runAnalysis} style={{ marginTop: spacing(2) }}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                Re-analyze with AI
              </Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}


