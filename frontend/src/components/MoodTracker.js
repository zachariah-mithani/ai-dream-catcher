import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Card } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

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

const TIME_PERIODS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: null }
];

export default function MoodTracker() {
  const { colors, spacing } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [moodData, setMoodData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMoodData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/moods');
      const allMoods = response.data.items || [];
      
      // Filter by selected period
      const cutoffDate = selectedPeriod 
        ? new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000)
        : null;
      
      const filteredMoods = cutoffDate 
        ? allMoods.filter(mood => new Date(mood.created_at) >= cutoffDate)
        : allMoods;
      
      setMoodData(filteredMoods);
    } catch (error) {
      console.log('Failed to load mood data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMoodData();
  }, [selectedPeriod]);

  const getMoodCounts = () => {
    const counts = {};
    MOODS.forEach(mood => {
      counts[mood.name] = 0;
    });
    
    moodData.forEach(entry => {
      if (counts[entry.mood] !== undefined) {
        counts[entry.mood]++;
      }
    });
    
    return counts;
  };

  const getTotalMoods = () => {
    return moodData.length;
  };

  const getMostCommonMood = () => {
    const counts = getMoodCounts();
    let maxCount = 0;
    let mostCommon = 'None';
    
    Object.entries(counts).forEach(([mood, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = mood;
      }
    });
    
    return { mood: mostCommon, count: maxCount };
  };

  const renderPeriodSelector = () => (
    <View style={{ 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      gap: spacing(1),
      marginBottom: spacing(2)
    }}>
      {TIME_PERIODS.map((period) => (
        <TouchableOpacity
          key={period.days || 'all'}
          onPress={() => setSelectedPeriod(period.days)}
          style={{
            backgroundColor: selectedPeriod === period.days ? colors.primary : colors.inputBackground,
            paddingVertical: spacing(1),
            paddingHorizontal: spacing(2),
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedPeriod === period.days ? colors.primary : colors.border
          }}
        >
          <Text style={{ 
            color: selectedPeriod === period.days ? 'white' : colors.text, 
            fontSize: 12,
            fontWeight: '600'
          }}>
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMoodStats = () => {
    const counts = getMoodCounts();
    const total = getTotalMoods();
    const mostCommon = getMostCommonMood();
    
    return (
      <View style={{ marginBottom: spacing(2) }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          marginBottom: spacing(2) 
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
              {total}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Total Moods
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
              {mostCommon.count}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Most Common
            </Text>
          </View>
        </View>
        
        {mostCommon.count > 0 && (
          <View style={{ 
            backgroundColor: colors.inputBackground, 
            padding: spacing(2), 
            borderRadius: 8,
            marginBottom: spacing(2)
          }}>
            <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center' }}>
              Your most common mood is <Text style={{ fontWeight: '600' }}>
                {MOODS.find(m => m.name === mostCommon.mood)?.emoji} {mostCommon.mood}
              </Text> with {mostCommon.count} entries
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderMoodBreakdown = () => {
    const counts = getMoodCounts();
    const total = getTotalMoods();
    
    if (total === 0) {
      return (
        <Text style={{ 
          color: colors.textSecondary, 
          textAlign: 'center', 
          fontStyle: 'italic',
          padding: spacing(2)
        }}>
          No moods logged in this period
        </Text>
      );
    }
    
    return (
      <View>
        <Text style={{ 
          color: colors.text, 
          fontSize: 16, 
          fontWeight: '600', 
          marginBottom: spacing(2) 
        }}>
          Mood Breakdown
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing(1) }}>
            {MOODS
              .map((mood) => ({
                ...mood,
                count: counts[mood.name]
              }))
              .filter(mood => mood.count > 0)
              .sort((a, b) => b.count - a.count)
              .map((mood) => {
                const percentage = total > 0 ? Math.round((mood.count / total) * 100) : 0;
                
                return (
                  <View
                    key={mood.name}
                    style={{
                      backgroundColor: colors.card,
                      padding: spacing(2),
                      borderRadius: 12,
                      alignItems: 'center',
                      minWidth: 80,
                      borderWidth: 1,
                      borderColor: colors.border
                    }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: spacing(1) }}>
                      {mood.emoji}
                    </Text>
                    <Text style={{ 
                      color: colors.text, 
                      fontSize: 18, 
                      fontWeight: '700' 
                    }}>
                      {mood.count}
                    </Text>
                    <Text style={{ 
                      color: colors.textSecondary, 
                      fontSize: 12 
                    }}>
                      {percentage}%
                    </Text>
                    <Text style={{ 
                      color: colors.textSecondary, 
                      fontSize: 10,
                      textAlign: 'center'
                    }}>
                      {mood.name}
                    </Text>
                  </View>
                );
              })}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Card style={{ backgroundColor: colors.card, marginBottom: spacing(2) }}>
      <Text style={{ 
        color: colors.text, 
        fontSize: 18, 
        fontWeight: '700', 
        marginBottom: spacing(2) 
      }}>
        Mood Tracker
      </Text>
      
      {renderPeriodSelector()}
      {renderMoodStats()}
      {renderMoodBreakdown()}
      
      <TouchableOpacity
        onPress={loadMoodData}
        disabled={loading}
        style={{
          backgroundColor: colors.accent,
          paddingVertical: spacing(1),
          paddingHorizontal: spacing(2),
          borderRadius: 8,
          alignItems: 'center',
          marginTop: spacing(2)
        }}
      >
        <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Text>
      </TouchableOpacity>
    </Card>
  );
}
