import React, { useState, useEffect, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card, Button } from '../ui/components';
import { spacing } from '../ui/Theme';
import { getRandomPrompts } from '../api';

const MOODS = ['Happy', 'Sad', 'Anxious', 'Excited', 'Confused', 'Angry', 'Peaceful', 'Scared', 'Curious', 'Nostalgic', 'Neutral'];
const COMMON_TAGS = ['Nightmare', 'Lucid', 'Flying', 'Falling', 'Chase', 'Adventure', 'Romance', 'Work', 'Family', 'Friends', 'Animals', 'Nature', 'Fantasy', 'Sci-Fi'];

const DreamLogForm = ({
  title,
  setTitle,
  content,
  setContent,
  selectedMoods,
  setSelectedMoods,
  selectedTags,
  setSelectedTags,
  dreamDate,
  setDreamDate,
  addDream,
  listening,
  startVoice,
  stopVoice,
  navigation,
}) => {
  const [prompts, setPrompts] = useState([]);
  const [customTag, setCustomTag] = useState('');

  const loadPrompts = async () => {
    try {
      const data = await getRandomPrompts(3);
      setPrompts(data.items || []);
    } catch (e) {
      console.log('Failed to load prompts:', e.message);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const renderMoodSelector = () => (
    <View style={{ marginBottom: spacing(2) }}>
      <Text style={{ color: 'white', fontWeight: '600', marginBottom: spacing(1) }}>How did you feel when you woke up?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) }}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood}
            onPress={() => {
              setSelectedMoods((prev) =>
                prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
              );
            }}
            style={{
              backgroundColor: selectedMoods.includes(mood) ? '#22c55e' : '#1f2937',
              paddingVertical: spacing(1),
              paddingHorizontal: spacing(2),
              borderRadius: 20,
            }}
          >
            <Text style={{ color: selectedMoods.includes(mood) ? 'black' : 'white', fontSize: 12 }}>{mood}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const renderTagSelector = () => (
    <View style={{ marginBottom: spacing(2) }}>
      <Text style={{ color: 'white', fontWeight: '600', marginBottom: spacing(1) }}>Tags (optional)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) }}>
        {COMMON_TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            onPress={() => {
              setSelectedTags((prev) =>
                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
              );
            }}
            style={{
              backgroundColor: selectedTags.includes(tag) ? '#3b82f6' : '#1f2937',
              paddingVertical: spacing(1),
              paddingHorizontal: spacing(2),
              borderRadius: 20,
            }}
          >
            <Text style={{ color: selectedTags.includes(tag) ? 'white' : 'white', fontSize: 12 }}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Custom tag input */}
      <View style={{ flexDirection: 'row', marginTop: spacing(1), gap: spacing(1) }}>
        <TextInput
          placeholder="Add custom tag..."
          placeholderTextColor="#94a3b8"
          value={customTag}
          onChangeText={setCustomTag}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            padding: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#1f2937',
            flex: 1,
            fontSize: 12
          }}
          onSubmitEditing={addCustomTag}
        />
        <TouchableOpacity
          onPress={addCustomTag}
          style={{
            backgroundColor: '#3b82f6',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ padding: spacing(2) }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginBottom: spacing(1) }}>Log Your Dream</Text>

      <TextInput
        placeholder="Dream Title (Optional)"
        placeholderTextColor="#94a3b8"
        value={title}
        onChangeText={setTitle}
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          padding: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#1f2937',
          marginBottom: 8
        }}
      />

      <View style={{ marginBottom: spacing(2) }}>
        <Text style={{ color: 'white', fontWeight: '600', marginBottom: spacing(1) }}>Dream Date</Text>
        <TextInput
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
          value={dreamDate}
          onChangeText={setDreamDate}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            padding: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#1f2937',
            marginBottom: 4
          }}
        />
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
          Leave empty for today's date, or enter a specific date (YYYY-MM-DD format)
        </Text>
      </View>
      
      <TextInput
        placeholder="Describe your dream..."
        placeholderTextColor="#94a3b8"
        multiline
        value={content}
        onChangeText={setContent}
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          padding: 10,
          borderRadius: 8,
          height: 120,
          borderWidth: 1,
          borderColor: '#1f2937',
          marginBottom: 8
        }}
      />

      {renderMoodSelector()}
      {renderTagSelector()}
      
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button title="Save" onPress={addDream} style={{ flex: 1 }} />
        <Button title={listening ? 'Stop' : 'Voice'} onPress={listening ? stopVoice : startVoice} />
        <Button title="Chat" onPress={() => navigation.navigate('Chat')} />
      </View>

      {prompts.length > 0 && (
        <View style={{ marginTop: spacing(3) }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '700', marginBottom: spacing(1) }}>
            Guided Prompts
          </Text>
          {prompts.map((prompt, index) => (
            <Card key={index} style={{ marginBottom: spacing(1) }}>
              <TouchableOpacity onPress={() => setContent(prev => prev + '\n' + prompt.prompt)}>
                <Text style={{ color: '#94a3b8', fontSize: 14 }}>{prompt.prompt}</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
};

export default memo(DreamLogForm);
