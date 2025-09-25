import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Screen, Card, Button } from '../ui/components';
import { spacing } from '../ui/Theme';
import { listDreams, createDream, deleteDream, getPatterns } from '../api';
import DreamLogForm from '../components/DreamLogForm';

export default function EnhancedJournalScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [dreamDate, setDreamDate] = useState('');
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listening, setListening] = useState(false);

  const load = async () => {
    setListRefreshing(true);
    try {
      const data = await listDreams();
      setItems(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load dreams');
    } finally {
      setListRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startVoice = useCallback(async () => {
    Alert.alert('Voice input unavailable', 'Using text input.');
  }, []);

  const stopVoice = useCallback(async () => {
    setListening(false);
  }, []);

  const addDream = useCallback(async () => {
    if (!content.trim()) return;
    
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
    } catch (e) {
      Alert.alert('Error', 'Failed to save dream');
    }
  }, [content, title, selectedMoods, selectedTags, dreamDate, items]);

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
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing(3) }}
        refreshing={listRefreshing}
        onRefresh={load}
        data={items}
        keyExtractor={(item)=>String(item.id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing(2), marginTop: spacing(1) }}>
            <Card>
              <TouchableOpacity onPress={() => navigation.navigate('DreamDetail', { item })}>
                <Text style={{ color: 'white', fontWeight: '700' }}>{item.title || 'Untitled dream'}</Text>
                <Text style={{ color: '#cbd5e1' }} numberOfLines={2}>{item.content}</Text>
                
                {(item.moods || item.tags) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {item.moods && (() => {
                      try {
                        const moods = typeof item.moods === 'string' ? JSON.parse(item.moods) : item.moods;
                        return Array.isArray(moods) ? moods.map((mood, index) => (
                          <View key={index} style={{ 
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
                          <View key={index} style={{ 
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
                  <Button title="Ask" onPress={() => navigation.navigate('Chat', { seed: item })} />
                  <Button title="Delete" onPress={() => removeDream(item.id)} kind="danger" />
                </View>
              </TouchableOpacity>
            </Card>
          </View>
        )}
      />
    </Screen>
  );
}
