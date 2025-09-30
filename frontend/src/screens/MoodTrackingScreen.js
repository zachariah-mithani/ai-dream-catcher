import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Screen, Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';
import MarkdownText from '../components/MarkdownText';

const MOODS = [
  { name: 'Happy', emoji: '😊', color: '#22c55e' },
  { name: 'Sad', emoji: '😢', color: '#3b82f6' },
  { name: 'Anxious', emoji: '😰', color: '#f59e0b' },
  { name: 'Excited', emoji: '🤩', color: '#ef4444' },
  { name: 'Confused', emoji: '😕', color: '#8b5cf6' },
  { name: 'Angry', emoji: '😠', color: '#ef4444' },
  { name: 'Peaceful', emoji: '😌', color: '#10b981' },
  { name: 'Scared', emoji: '😨', color: '#6b7280' },
  { name: 'Curious', emoji: '🤔', color: '#f59e0b' },
  { name: 'Nostalgic', emoji: '🥺', color: '#8b5cf6' },
  { name: 'Neutral', emoji: '😐', color: '#6b7280' }
];

export default function MoodTrackingScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const [selectedMood, setSelectedMood] = useState('');
  const [moodHistory, setMoodHistory] = useState([]);
  const [insights, setInsights] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMoodHistory = async () => {
    try {
      const response = await api.get('/moods');
      setMoodHistory(response.data.items || []);
    } catch (e) {
      console.log('Failed to load mood history:', e.message);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await api.get('/moods/insights');
      setInsights(response.data.insights || '');
    } catch (e) {
      console.log('Failed to load insights:', e.message);
    }
  };

  useEffect(() => {
    loadMoodHistory();
    loadInsights();
  }, []);

  const logMood = async () => {
    if (!selectedMood) return;
    
    setLoading(true);
    try {
      await api.post('/moods', { mood: selectedMood });
      setSelectedMood('');
      loadMoodHistory();
      loadInsights();
      Alert.alert('Success', 'Mood logged successfully!');
    } catch (e) {
      console.log('Mood logging error:', e);
      if (e.response?.status === 401 || e.response?.data?.error?.includes('token')) {
        Alert.alert('Authentication Error', 'Please log in again to log moods.');
      } else {
        Alert.alert('Error', `Failed to log mood: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMoodSelector = () => (
    <Card style={{ marginBottom: 16, backgroundColor: colors.card }}>
      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 18, marginBottom: 12, textAlign: 'center' }}>
        How are you feeling right now?
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
        {MOODS.map(mood => (
          <TouchableOpacity
            key={mood.name}
            onPress={() => setSelectedMood(mood.name)}
            style={{
              width: 80,
              height: 80,
              margin: 8,
              borderRadius: 16,
              backgroundColor: selectedMood === mood.name ? mood.color : colors.inputBackground,
              borderWidth: 2,
              borderColor: selectedMood === mood.name ? mood.color : colors.border,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text style={{ fontSize: 24, marginBottom: 4 }}>{mood.emoji}</Text>
            <Text style={{ color: colors.text, fontSize: 10, textAlign: 'center' }}>{mood.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {selectedMood && (
        <TouchableOpacity
          onPress={logMood}
          disabled={loading}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
            {loading ? 'Logging...' : `Log ${selectedMood} Mood`}
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );


  const renderInsights = () => {
    return (
      <Card style={{ marginBottom: 16, backgroundColor: colors.card }}>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16, marginBottom: 12 }}>Mood Insights</Text>
        {insights ? (
          <MarkdownText style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
            {insights}
          </MarkdownText>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', textAlign: 'center' }}>
            Log more moods and dreams to get AI insights about your patterns!
          </Text>
        )}
      </Card>
    );
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16 }}>Mood Tracking</Text>
        
        {renderMoodSelector()}
        {renderInsights()}
        
        <TouchableOpacity 
          onPress={() => {
            loadMoodHistory();
            loadInsights();
          }}
          style={{
            backgroundColor: colors.accent,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
