import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Screen, Card, Button } from '../ui/components';
import { spacing } from '../ui/Theme';
import { listDreams, createDream, deleteDream, getPatterns } from '../api';
import { useBilling } from '../contexts/BillingContext';
import { InlineUpgradePrompt } from '../components/UpgradePrompt';

export default function JournalScreen({ navigation }) {
  const billing = useBilling();
  const [items, setItems] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
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

  useEffect(() => {}, []);

  const startVoice = async () => {
    Alert.alert('Voice input unavailable', 'Using text input.');
  };

  const stopVoice = async () => {
    setListening(false);
  };

  const addDream = async () => {
    if (!content.trim()) return;
    const payload = { title: title.trim() || null, content: content.trim() };
    try {
      const created = await createDream(payload);
      setItems([created, ...items]);
      setTitle('');
      setContent('');
    } catch (e) {
      Alert.alert('Error', 'Failed to save dream');
    }
  };

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
      <View style={{ paddingHorizontal: spacing(2), gap: spacing(1) }}>
        <Card>
          <TextInput placeholder="Title (optional)" placeholderTextColor="#94a3b8" value={title} onChangeText={setTitle} style={{ backgroundColor: 'transparent', color: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1f2937', marginBottom: 8 }} />
          <TextInput placeholder="Describe your dream..." placeholderTextColor="#94a3b8" multiline value={content} onChangeText={setContent} style={{ backgroundColor: 'transparent', color: 'white', padding: 10, borderRadius: 8, height: 120, borderWidth: 1, borderColor: '#1f2937' }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Save" onPress={addDream} style={{ flex: 1 }} />
            <Button title={listening ? 'Stop' : 'Voice'} onPress={listening ? stopVoice : startVoice} />
            <Button title="Chat" onPress={() => navigation.navigate('Chat')} />
          </View>
          <TouchableOpacity onPress={openPatterns} style={{ alignSelf: 'flex-end', paddingVertical: 8 }}>
            <Text style={{ color: '#93c5fd' }}>View patterns</Text>
          </TouchableOpacity>
        </Card>
        
        {/* Show upgrade prompt if dream creation limit is reached or close */}
        {!billing?.isPremium && (
          <InlineUpgradePrompt
            limitType="dream_create"
            currentUsage={billing?.usage?.dream_create || 0}
            limit={5}
            period="month"
          />
        )}
      </View>

      <FlatList
        style={{ flex: 1, marginTop: spacing(2) }}
        contentContainerStyle={{ paddingHorizontal: spacing(2), paddingBottom: spacing(3), gap: spacing(1) }}
        refreshing={listRefreshing}
        onRefresh={load}
        data={items}
        keyExtractor={(item)=>String(item.id)}
        renderItem={({ item }) => (
          <Card>
            <TouchableOpacity onPress={() => navigation.navigate('DreamDetail', { item })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: 'white', fontWeight: '700', flex: 1 }}>{item.title || 'Untitled dream'}</Text>
                {item.user_dream_number && (
                  <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600' }}>
                    Dream #{item.user_dream_number}
                  </Text>
                )}
              </View>
              <Text style={{ color: '#cbd5e1' }} numberOfLines={2}>{item.content}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title="Ask" onPress={() => navigation.navigate('Chat', { seed: item })} />
                <Button title="Delete" onPress={() => removeDream(item.id)} kind="danger" />
              </View>
            </TouchableOpacity>
          </Card>
        )}
      />
    </Screen>
  );
}


