import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Screen, Text, Card, Subtle, Button } from '../ui/components';
import { spacing } from '../ui/Theme';
import { analyzeDream } from '../api';

export default function DreamDetailScreen({ route }) {
  const { item } = route.params;
  const [analysis, setAnalysis] = useState(item.analysis || null);
  const [busy, setBusy] = useState(false);

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
          <Text style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 24 }}>
            {item.content}
          </Text>
          
          {(item.mood || item.tags) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(2) }}>
              {item.mood && (
                <View style={{ 
                  backgroundColor: '#22c55e', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 16, 
                  marginRight: 8, 
                  marginBottom: 8 
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{item.mood}</Text>
                </View>
              )}
              {item.tags && JSON.parse(item.tags).map((tag, index) => (
                <View key={index} style={{ 
                  backgroundColor: '#3b82f6', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 16, 
                  marginRight: 8, 
                  marginBottom: 8 
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{tag}</Text>
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
            <Text style={{ color: '#94a3b8', marginBottom: spacing(2) }}>
              Get AI-powered insights into your dream's meaning and symbolism.
            </Text>
            <Button
              title={busy ? 'Analyzing...' : 'Analyze with AI'}
              onPress={runAnalysis}
              disabled={busy}
              style={{ 
                backgroundColor: busy ? '#6b7280' : '#22c55e',
                paddingVertical: spacing(2)
              }}
            />
            {busy && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing(1) }}>
                <ActivityIndicator color="#22c55e" size="small" style={{ marginRight: spacing(1) }} />
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
            <Text style={{ color: '#e2e8f0', fontSize: 16, lineHeight: 24 }}>
              {analysis}
            </Text>
            <TouchableOpacity onPress={runAnalysis} style={{ marginTop: spacing(2) }}>
              <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '600' }}>
                Re-analyze with AI
              </Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}


