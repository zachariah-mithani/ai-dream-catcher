import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Screen, Text, Card, Subtle, Button } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { listDreams, deleteDream, getStatistics } from '../api';

export default function DreamLogScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadDreams = async (reset = false, pageParam = page) => {
    setLoading(true);
    try {
      console.log('Loading dreams...');
      const res = await listDreams({ q, page: pageParam, page_size: 20 });
      setDreams(reset ? res.items : [...dreams, ...res.items]);
      setTotal(res.total);
    } catch (e) {
      console.log('Dreams loading error:', e);
      Alert.alert('Error', 'Failed to load dreams');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    setStatsLoading(true);
    try {
      console.log('Loading statistics...');
      const statsData = await getStatistics();
      setStats(statsData);
    } catch (e) {
      console.log('Statistics loading error:', e);
      // Don't show alert for stats, just log the error
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([loadDreams(true, 1), loadStatistics()]);
    setRefreshing(false);
  };

  const analyzeDreamAI = async (dream) => {
    try {
      console.log('Analyzing dream:', dream.id);
      
      // Navigate to chat with the dream context and auto-send analysis request
      navigation.navigate('Chat', { 
        seed: {
          ...dream,
          autoAnalyze: true // Flag to trigger automatic analysis
        }
      });
    } catch (e) {
      console.log('Analysis error:', e);
      Alert.alert('Error', 'Failed to analyze dream. Please try again.');
    }
  };

  const removeDream = async (id) => {
    try {
      await deleteDream(id);
      setDreams(dreams.filter(i => i.id !== id));
    } catch (e) {
      Alert.alert('Error', 'Failed to delete dream');
    }
  };

  useEffect(() => {
    loadDreams();
    loadStatistics();
  }, []);

  const renderStatisticsCards = () => {
    // Calculate current month's dream count
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthDreams = stats?.monthlyDreams?.find(m => m.month === currentMonth)?.count || 0;
    
    return (
      <View style={{ flexDirection: 'row', gap: spacing(2), marginBottom: spacing(3) }}>
        <Card style={{ flex: 1, backgroundColor: colors.card, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing(1) }}>
            Total Dreams
          </Text>
          <Text style={{ color: colors.primary, fontSize: 32, fontWeight: '800' }}>
            {stats?.totalDreams || 0}
          </Text>
          <Subtle style={{ fontSize: 12 }}>All time</Subtle>
        </Card>
        
        <Card style={{ flex: 1, backgroundColor: colors.card, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing(1) }}>
            This Month
          </Text>
          <Text style={{ color: colors.primary, fontSize: 32, fontWeight: '800' }}>
            {currentMonthDreams}
          </Text>
          <Subtle style={{ fontSize: 12 }}>Current month</Subtle>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const renderDreamCard = ({ item }) => (
    <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
      <View style={{ marginBottom: spacing(1) }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing(1) }}>
          {item.title || 'Untitled Dream'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: spacing(1) }} numberOfLines={3}>
          {item.content}
        </Text>
        
        {(item.mood || item.tags || item.moods) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing(1) }}>
            {item.mood && (
              <View style={{ 
                backgroundColor: colors.primary, 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 12, 
                marginRight: 6, 
                marginBottom: 4 
              }}>
                  <Text style={{ color: colors.primaryText, fontSize: 10, fontWeight: '600' }}>{item.mood}</Text>
              </View>
            )}
            {item.moods && (() => {
              try {
                const moods = typeof item.moods === 'string' ? JSON.parse(item.moods) : item.moods;
                return Array.isArray(moods) ? moods.map((mood, index) => (
                  <View key={index} style={{ 
                    backgroundColor: colors.primary, 
                    paddingHorizontal: 8, 
                    paddingVertical: 4, 
                    borderRadius: 12, 
                    marginRight: 6, 
                    marginBottom: 4 
                  }}>
                    <Text style={{ color: colors.primaryText, fontSize: 10, fontWeight: '600' }}>{mood}</Text>
                  </View>
                )) : null;
              } catch (e) {
                return null;
              }
            })()}
            {item.tags && (() => {
              try {
                const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags;
                return Array.isArray(tags) ? tags.map((tag, index) => (
                  <View key={index} style={{ 
                    backgroundColor: colors.accent, 
                    paddingHorizontal: 8, 
                    paddingVertical: 4, 
                    borderRadius: 12, 
                    marginRight: 6, 
                    marginBottom: 4 
                  }}>
                    <Text style={{ color: colors.primaryText, fontSize: 10, fontWeight: '600' }}>{tag}</Text>
                  </View>
                )) : null;
              } catch (e) {
                return null;
              }
            })()}
          </View>
        )}
        
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing(1) }}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing(1) }}>
        <Button 
          title="Analyze" 
          onPress={() => analyzeDreamAI(item)}
          style={{ 
            flex: 1, 
            backgroundColor: colors.primary,
            minWidth: 80
          }}
        />
        <Button 
          title="Chat" 
          onPress={() => navigation.navigate('Chat', { seed: item })}
          style={{ 
            flex: 1, 
            backgroundColor: colors.accent,
            minWidth: 80
          }}
        />
        <Button 
          title="Edit" 
          onPress={() => navigation.navigate('EditDream', { dream: item })}
          style={{ 
            flex: 1, 
            backgroundColor: colors.buttonSecondary || colors.surface,
            minWidth: 80
          }}
        />
        <Button 
          title="Delete" 
          onPress={() => removeDream(item.id)}
          kind="danger"
          style={{ 
            flex: 1,
            minWidth: 80
          }}
        />
      </View>
    </Card>
  );

  const loadMore = async () => {
    if (dreams.length >= total || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadDreams(false, nextPage);
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing(2), paddingTop: spacing(2) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(2) }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Dream Log</Text>
          <Button 
            title="Refresh" 
            onPress={onRefresh}
            style={{ paddingHorizontal: spacing(2), paddingVertical: spacing(1) }}
          />
        </View>
        <Subtle style={{ marginBottom: spacing(2) }}>View and analyze your dreams</Subtle>

        {/* Simple search input substitute */}
        <Button
          kind="secondary"
          title={q ? `Clear search: ${q}` : 'Tap to search (find in title or content)'}
          onPress={async () => {
            const newQ = q ? '' : q; // placeholder - pressing clears current query
            setQ(newQ);
            setPage(1);
            await loadDreams(true);
          }}
          style={{ marginBottom: spacing(2) }}
        />
        
        {renderStatisticsCards()}
      </View>
      
      <FlatList
        data={dreams}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: spacing(2), paddingBottom: spacing(3) }}
        renderItem={renderDreamCard}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListEmptyComponent={
          <View style={{ padding: spacing(3), alignItems: 'center' }}>
            <Subtle style={{ textAlign: 'center', marginBottom: spacing(1) }}>
              No dreams logged yet.
            </Subtle>
            <Subtle style={{ textAlign: 'center' }}>
              Start logging your dreams to see them here.
            </Subtle>
          </View>
        }
      />
    </Screen>
  );
}


