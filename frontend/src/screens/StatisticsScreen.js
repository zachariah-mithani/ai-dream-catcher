import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Screen, Card } from '../ui/components';
import { spacing } from '../ui/Theme';
import { api } from '../api';

export default function StatisticsScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      console.log('Loading statistics...');
      const response = await api.get('/statistics');
      console.log('Statistics response:', response.data);
      setStats(response.data);
    } catch (e) {
      console.log('Statistics API error:', e);
      
      // Check if it's an authentication error
      if (e.response?.status === 401 || e.response?.data?.error?.includes('token')) {
        Alert.alert('Authentication Error', 'Please log in again to view statistics.');
        setLoading(false);
        return;
      }
      
      // Set default empty stats to prevent null errors
      setStats({
        totalDreams: 0,
        monthlyDreams: [],
        commonTags: [],
        commonAiTags: [],
        moodDistribution: [],
        recurringThemes: []
      });
      Alert.alert('Error', `Failed to load statistics: ${e.message}. Using default values.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>Loading statistics...</Text>
      </Screen>
    );
  }

  if (!stats) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
          Unable to load statistics
        </Text>
        <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 20 }}>
          Please make sure you're logged in and try again.
        </Text>
        <TouchableOpacity 
          onPress={loadStats}
          style={{
            backgroundColor: '#22c55e',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  const renderStatCard = (title, value, subtitle) => (
    <Card style={{ marginBottom: 12 }}>
      <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, marginBottom: 4 }}>{title}</Text>
      <Text style={{ color: '#22c55e', fontSize: 24, fontWeight: '700' }}>{value}</Text>
      {subtitle && <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{subtitle}</Text>}
    </Card>
  );

  const renderTagCloud = (tags, title) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, marginBottom: 8 }}>{title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {tags.slice(0, 10).map((tag, index) => (
            <View
              key={index}
              style={{
                backgroundColor: '#374151',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                marginRight: 6,
                marginBottom: 6
              }}
            >
              <Text style={{ color: 'white', fontSize: 12 }}>{tag.tag} ({tag.count})</Text>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const renderMoodChart = () => {
    if (!stats?.moodDistribution || stats.moodDistribution.length === 0) return null;
    
    const maxCount = Math.max(...stats.moodDistribution.map(m => m.count));
    if (maxCount === 0) return null; // Avoid division by zero
    
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, marginBottom: 8 }}>Mood Distribution</Text>
        {stats.moodDistribution.map((mood, index) => {
          const percentage = maxCount > 0 ? (mood.count / maxCount) * 100 : 0;
          return (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'white', fontSize: 14 }}>{mood.mood}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>{mood.count}</Text>
              </View>
              <View style={{ 
                height: 8, 
                backgroundColor: '#374151', 
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <View style={{ 
                  height: '100%', 
                  width: `${Math.max(0, Math.min(100, percentage))}%`, 
                  backgroundColor: '#22c55e',
                  borderRadius: 4
                }} />
              </View>
            </View>
          );
        })}
      </Card>
    );
  };

  const renderMonthlyChart = () => {
    if (!stats?.monthlyDreams || stats.monthlyDreams.length === 0) return null;
    
    const maxCount = Math.max(...stats.monthlyDreams.map(m => m.count));
    if (maxCount === 0) return null; // Avoid division by zero
    
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, marginBottom: 8 }}>Dreams by Month</Text>
        {stats.monthlyDreams.slice(0, 6).map((month, index) => {
          const percentage = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
          return (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'white', fontSize: 14 }}>{month.month}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>{month.count}</Text>
              </View>
              <View style={{ 
                height: 8, 
                backgroundColor: '#374151', 
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <View style={{ 
                  height: '100%', 
                  width: `${Math.max(0, Math.min(100, percentage))}%`, 
                  backgroundColor: '#3b82f6',
                  borderRadius: 4
                }} />
              </View>
            </View>
          );
        })}
      </Card>
    );
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(2) }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 16 }}>Dream Statistics</Text>
        
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            {renderStatCard('Total Dreams', stats?.totalDreams || 0, 'All time')}
          </View>
          <View style={{ flex: 1 }}>
            {renderStatCard('This Month', (() => {
              const currentMonth = new Date().toISOString().slice(0, 7);
              return stats?.monthlyDreams?.find(m => m.month === currentMonth)?.count || 0;
            })(), 'Current month')}
          </View>
        </View>

        {renderMonthlyChart()}
        {renderMoodChart()}
        {renderTagCloud(stats?.commonTags, 'Your Tags')}
        {renderTagCloud(stats?.commonAiTags, 'AI Suggested Tags')}
        
        {stats?.recurringThemes && stats.recurringThemes.length > 0 && (
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, marginBottom: 8 }}>Recurring Themes</Text>
            {stats.recurringThemes.map((theme, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                paddingVertical: 4,
                borderBottomWidth: 1,
                borderBottomColor: '#374151'
              }}>
                <Text style={{ color: 'white', fontSize: 14 }}>{theme.theme}</Text>
                <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '600' }}>{theme.frequency}x</Text>
              </View>
            ))}
          </Card>
        )}

        <TouchableOpacity 
          onPress={loadStats}
          style={{
            backgroundColor: '#22c55e',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 16
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Refresh Statistics</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
