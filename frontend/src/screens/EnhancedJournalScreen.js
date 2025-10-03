import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import { Screen, Card, Button } from '../ui/components';
import { spacing } from '../ui/Theme';
import { listDreams, createDream, deleteDream, getPatterns } from '../api';
import { useBilling } from '../contexts/BillingContext';
import DreamLogForm from '../components/DreamLogForm';

const DreamItem = memo(function DreamItem({ item, onPress, onDelete }) {
  return (
    <View style={{ paddingHorizontal: spacing(2), marginTop: spacing(1) }}>
      <Card>
        <TouchableOpacity onPress={onPress}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{item.title || 'Untitled dream'}</Text>
          <Text style={{ color: '#cbd5e1' }} numberOfLines={2}>{item.content}</Text>
          {(item.moods || item.tags) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {item.moods && (() => {
                try {
                  const moods = typeof item.moods === 'string' ? JSON.parse(item.moods) : item.moods;
                  return Array.isArray(moods) ? moods.map((mood, index) => (
                    <View key={`mood-${item.id}-${index}-${mood}`} style={{ 
                      backgroundColor: '#22c55e', 
                      paddingHorizontal: 6, 
                      paddingVertical: 2, 
                      borderRadius: 8, 
                      marginRight: 4, 
                      marginBottom: 4 
                    }}>
                      <Text style={{ color: 'white', fontSize: 10 }}>{mood}</Text>
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
                    <View key={`tag-${item.id}-${index}-${tag}`} style={{ 
                      backgroundColor: '#3b82f6', 
                      paddingHorizontal: 6, 
                      paddingVertical: 2, 
                      borderRadius: 8, 
                      marginRight: 4, 
                      marginBottom: 4 
                    }}>
                      <Text style={{ color: 'white', fontSize: 10 }}>{tag}</Text>
                    </View>
                  )) : null;
                } catch (e) {
                  return null;
                }
              })()}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Ask" onPress={onPress} />
            <Button title="Delete" onPress={onDelete} kind="danger" />
          </View>
        </TouchableOpacity>
      </Card>
    </View>
  );
});

export default function EnhancedJournalScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const billing = useBilling();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [dreamDate, setDreamDate] = useState('');
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listening, setListening] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = async (reset = false, pageParam = page) => {
    if (reset) setListRefreshing(true);
    try {
      const data = await listDreams({ page: pageParam, page_size: pageSize });
      setItems(prev => reset ? data.items : [...prev, ...data.items]);
      setTotal(data.total || 0);
    } catch (e) {
      Alert.alert('Error', 'Failed to load dreams');
    } finally {
      if (reset) setListRefreshing(false);
    }
  };

  useEffect(() => {
    load(true, 1);
  }, []);

  const startVoice = useCallback(async () => {
    Alert.alert('Voice input unavailable', 'Using text input.');
  }, []);

  const stopVoice = useCallback(async () => {
    setListening(false);
  }, []);

  const addDream = useCallback(async () => {
    if (!billing?.canUse('dream_create')) {
      navigation.navigate('Paywall');
      return;
    }
    if (!content.trim() && !title.trim()) return;
    
    // Use custom date if provided, otherwise use current date
    const dreamDateToUse = dreamDate.trim() || new Date().toISOString().split('T')[0];
    
    const payload = { 
      title: title.trim() || null, 
      content: content.trim(),
      moods: selectedMoods,
      tags: selectedTags,
      dream_date: dreamDateToUse
    };
    try {
      const created = await createDream(payload);
      setItems([created, ...items]);
      setTitle('');
      setContent('');
      setSelectedMoods([]);
      setSelectedTags([]);
      setDreamDate('');
      billing?.recordUsage('dream_create');
    } catch (e) {
      console.error('Dream creation error:', e);
      const errorMessage = e.response?.data?.error || e.message || 'Failed to save dream';
      Alert.alert('Error', errorMessage);
    }
  }, [content, title, selectedMoods, selectedTags, dreamDate, items, billing]);

  const removeDream = async (id) => {
    try {
      await deleteDream(id);
      setItems(items.filter(i => i.id !== id));
    } catch (e) {
      Alert.alert('Error', 'Failed to delete');
    }
  };

  const openPatterns = async () => {
    try {
      const p = await getPatterns();
      const summary = p.topWords.map(w => `${w.word} (${w.count})`).join(', ');
      Alert.alert('Patterns', `Total dreams: ${p.total}\nTop words: ${summary}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch patterns');
    }
  };



  return (
    <Screen>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing(3) }}
        refreshControl={
          <RefreshControl
            refreshing={listRefreshing}
            onRefresh={() => { setPage(1); load(true, 1); }}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            // Load more when near bottom
            if (items.length < total) {
              const next = page + 1;
              setPage(next);
              load(false, next);
            }
          }
        }}
        scrollEventThrottle={400}
      >
        <DreamLogForm
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          selectedMoods={selectedMoods}
          setSelectedMoods={setSelectedMoods}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          dreamDate={dreamDate}
          setDreamDate={setDreamDate}
          addDream={addDream}
          listening={listening}
          startVoice={startVoice}
          stopVoice={stopVoice}
          navigation={navigation}
        />
        
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', marginTop: spacing(4), marginBottom: spacing(2), paddingHorizontal: spacing(2) }}>Your Dreams</Text>
        
        {items.map((item) => (
          <DreamItem 
            key={String(item.id)}
            item={item}
            onPress={() => navigation.navigate('DreamDetail', { item })}
            onDelete={() => removeDream(item.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
