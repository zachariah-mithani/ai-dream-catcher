import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { Screen, Card, Button, Text as CustomText } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { chat, listDreams, analyzeDream } from '../api';
import MarkdownText from '../components/MarkdownText';

export default function ChatScreen({ route }) {
  const { colors, spacing } = useTheme();
  const seed = route.params?.seed;
  const [history, setHistory] = useState(seed ? [
    { role: 'user', content: `I want to discuss this dream:\n\nTitle: ${seed.title || 'Untitled'}\nContent: ${seed.content}` },
    ...(seed.analysis ? [{ role: 'assistant', content: `Here's my analysis of your dream:\n\n${seed.analysis}\n\nWhat would you like to know more about?` }] : [])
  ] : []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dreams, setDreams] = useState([]);

  useEffect(() => {
    loadDreams();
  }, []);

  // Auto-analyze dream if requested
  useEffect(() => {
    if (seed?.autoAnalyze && !seed?.analysis) {
      autoAnalyzeDream();
    }
  }, [seed]);

  const loadDreams = async () => {
    try {
      const dreamList = await listDreams();
      setDreams(dreamList);
    } catch (e) {
      console.log('Failed to load dreams:', e.message);
    }
  };

  const autoAnalyzeDream = async () => {
    if (!seed || busy) return;
    
    setBusy(true);
    try {
      // Add a message indicating analysis is starting
      const analysisMessage = { role: 'user', content: 'Please analyze this dream for me' };
      setHistory(prev => [...prev, analysisMessage]);
      
      // Get AI analysis and coerce to string robustly
      const raw = await analyzeDream(seed);
      const analysisText = typeof raw === 'string' ? raw : (raw?.response ?? raw?.text ?? '');
      
      // Add the analysis response to chat
      const analysisResponse = { 
        role: 'assistant', 
        content: `Here's my analysis of your dream:\n\n${(typeof analysisText === 'string' && analysisText.trim()) ? analysisText : 'I could not generate an analysis at this time.'}\n\nWhat would you like to know more about?` 
      };
      setHistory(prev => [...prev, analysisResponse]);
    } catch (e) {
      console.log('Auto-analysis error:', e);
      const errorResponse = { 
        role: 'assistant', 
        content: 'Sorry, I had trouble analyzing your dream. Please try asking me about it directly!' 
      };
      setHistory(prev => [...prev, errorResponse]);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    const nextHistory = [...history, { role: 'user', content: message.trim() }];
    setHistory(nextHistory);
    setMessage('');
    setBusy(true);
    try {
      const res = await chat(nextHistory, message.trim());
      setHistory(h => [...h, { role: 'assistant', content: res.response }]);
    } catch (e) {
      Alert.alert('Error', 'Chat failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startDreamChat = (dream) => {
    const contextMessage = {
      role: 'user',
      content: `I want to discuss this dream:\n\nTitle: ${dream.title || 'Untitled'}\nContent: ${dream.content}`
    };
    setHistory([contextMessage]);
  };

  const renderMessage = ({ item, index }) => (
    <View style={{ 
      marginBottom: spacing(2),
      alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '85%'
    }}>
      <Card style={{
        backgroundColor: item.role === 'user' ? colors.primary : colors.card,
        padding: spacing(2)
      }}>
        {item.role === 'assistant' ? (
          <MarkdownText style={{ 
            color: colors.text,
            fontSize: 16
          }}>
            {item.content}
          </MarkdownText>
        ) : (
          <CustomText style={{ 
            color: '#ffffff',
            fontSize: 16
          }}>
            {item.content}
          </CustomText>
        )}
      </Card>
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          {history.length === 0 && (
            <View style={{ padding: spacing(2) }}>
              <CustomText style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing(2) }}>
                Dream Analyst
              </CustomText>
              <CustomText style={{ color: colors.textSecondary, marginBottom: spacing(3) }}>
                Chat with AI about your dreams. You can ask for interpretations, patterns, or insights.
              </CustomText>
              
              {dreams.length > 0 && (
                <View>
                  <CustomText style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing(2) }}>
                    Recent Dreams:
                  </CustomText>
                  {dreams.slice(0, 3).map((dream, index) => (
                    <Card key={index} style={{ marginBottom: spacing(1), backgroundColor: colors.card }}>
                      <TouchableOpacity onPress={() => startDreamChat(dream)}>
                        <CustomText style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>
                          {dream.title || 'Untitled Dream'}
                        </CustomText>
                        <CustomText style={{ color: colors.textSecondary, fontSize: 14 }}>
                          {dream.content.substring(0, 100)}...
                        </CustomText>
                      </TouchableOpacity>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          )}

          <FlatList
            style={{ flex: 1 }}
            data={history}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: spacing(2) }}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <CustomText style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Start a conversation about your dreams
                </CustomText>
              </View>
            }
          />

          <View style={{ 
            flexDirection: 'row', 
            padding: spacing(2), 
            gap: spacing(1),
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border
          }}>
            <TextInput
              placeholder="Ask about your dream..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              style={{ 
                backgroundColor: colors.inputBackground, 
                color: colors.text, 
                padding: spacing(2), 
                borderRadius: 8, 
                flex: 1,
                fontSize: 16
              }}
              multiline
            />
            <Button
              onPress={send}
              disabled={busy || !message.trim()}
              style={{
                backgroundColor: busy ? colors.buttonDisabled : colors.primary,
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2)
              }}
            >
              <CustomText style={{ color: 'white', fontWeight: '600' }}>
                {busy ? '...' : 'Send'}
              </CustomText>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}


