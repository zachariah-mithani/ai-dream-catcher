import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ScrollView, Modal } from 'react-native';
import { Screen, Card, Button, Text as CustomText } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { chat, listDreams, analyzeDream, getChatHistory } from '../api';
import { useBilling } from '../contexts/BillingContext';
import MarkdownText from '../components/MarkdownText';
import { InlineUpgradePrompt } from '../components/UpgradePrompt';
import { track } from '../utils/events';

export default function ChatScreen({ route, navigation }) {
  const { colors, spacing } = useTheme();
  const billing = useBilling();
  const seed = route.params?.seed;
  const [history, setHistory] = useState(seed ? [
    { role: 'user', content: `I want to discuss this dream:\n\nTitle: ${seed.title || 'Untitled'}\nContent: ${seed.content}` },
    ...(seed.analysis ? [{ role: 'assistant', content: `Here's my analysis of your dream:\n\n${seed.analysis}\n\nWhat would you like to know more about?` }] : [])
  ] : []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dreams, setDreams] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [historyRetention, setHistoryRetention] = useState('7 days');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [selectIndex, setSelectIndex] = useState(-1);

  useEffect(() => {
    loadDreams();
    // History disabled: do not fetch chat history
    // First-time wellness disclaimer
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const seen = await AsyncStorage.getItem('seen_wellness_disclaimer');
        if (!seen) setShowDisclaimer(true);
      } catch {}
    })();
  }, []);

  // Track when billing is loaded
  useEffect(() => {
    if (billing) {
      setBillingLoaded(true);
    }
  }, [billing]);

  const loadChatHistory = async () => {
    try {
      const data = await getChatHistory();
      if (data.history && data.history.length > 0) {
        // Do not preload history into the active chat. Show it only in the History modal.
        // If a seed is provided, we still start the chat with that seed context.
        if (seed) {
          const seedHistory = [
            { role: 'user', content: `I want to discuss this dream:\n\nTitle: ${seed.title || 'Untitled'}\nContent: ${seed.content}` },
            ...(seed.analysis ? [{ role: 'assistant', content: `Here's my analysis of your dream:\n\n${seed.analysis}\n\nWhat would you like to know more about?` }] : [])
          ];
          setHistory(seedHistory);
        }

        // Set retention info
        if (data.retention) {
          setHistoryRetention(data.retention);
        }

        // Group history into sessions for the history modal only
        groupHistoryIntoSessions(data.history);
      }
    } catch (e) {
      console.log('Failed to load chat history:', e.message);
    }
  };

  const groupHistoryIntoSessions = (historyData) => {
    const sessions = [];
    let currentSession = [];
    
    for (let i = 0; i < historyData.length; i++) {
      const message = historyData[i];
      currentSession.push(message);
      
      // If this is the last message or the next message is from a different day
      if (i === historyData.length - 1 || 
          (historyData[i + 1] && 
           new Date(message.timestamp).toDateString() !== new Date(historyData[i + 1].timestamp).toDateString())) {
        
        if (currentSession.length > 0) {
          sessions.push({
            id: `session-${i}`,
            messages: [...currentSession],
            date: new Date(message.timestamp).toDateString(),
            preview: currentSession[0]?.content?.substring(0, 50) + '...' || 'Chat session'
          });
          currentSession = [];
        }
      }
    }
    
    setChatSessions(sessions);
  };

  const loadChatSession = (session) => {
    // Load a past session into the active chat
    setHistory(session.messages);
    setShowHistory(false);
  };

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
    
    // Check billing status
    if (!billing) {
      Alert.alert('Error', 'Billing information not loaded. Please try again.');
      return;
    }
    
    if (!billing.canUse('chat_message')) {
      Alert.alert('Limit reached', 'Upgrade to continue chatting.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'See Options', onPress: () => navigation.navigate('Billing') }
      ]);
      return;
    }
    
    const nextHistory = [...history, { role: 'user', content: message.trim() }];
    setHistory(nextHistory);
    setMessage('');
    setBusy(true);
    
    try {
      track('chat_send', { length: message.trim().length });
      console.log('Sending chat message:', { history: nextHistory, message: message.trim() });
      const res = await chat(nextHistory, message.trim());
      console.log('Chat response received:', res);
      setHistory(h => [...h, { role: 'assistant', content: res.response }]);
      billing?.recordUsage('chat_message');
      track('chat_response', { length: res?.response?.length || 0 });
    } catch (e) {
      console.error('Chat error:', e);
      const errorMessage = e.response?.data?.error || e.message || 'Chat failed. Please try again.';
      Alert.alert('Error', errorMessage);
      track('chat_error', { message: String(e?.message || e) });
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

  // Minimal markdown -> plain text for selection mode
  const markdownToPlainText = (s) => {
    if (typeof s !== 'string') return '';
    return s
      .replace(/\r\n/g, '\n')
      .replace(/^###\s+/gm, '')
      .replace(/^##\s+/gm, '')
      .replace(/^#\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/^(\d+)\.\s+/gm, '$1. ')
      .replace(/^\s*\*\s*$/gm, '') // remove orphan asterisk lines
      .replace(/^\s*#+\s*$/gm, '') // remove orphan heading markers
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const renderMessage = ({ item, index }) => (
    <View style={{ 
      marginBottom: spacing(2),
      alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '85%'
    }}>
      <Card style={{
        backgroundColor: item.role === 'user' ? colors.primary : colors.surface,
        padding: spacing(2),
        borderWidth: 1,
        borderColor: colors.border
      }}>
        {item.role === 'assistant' ? (
          <MarkdownText style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>
            {item.content}
          </MarkdownText>
        ) : (
          <CustomText style={{ 
            color: colors.primaryText,
            fontSize: 16
          }} selectable>
            {item.content}
          </CustomText>
        )}
      </Card>
    </View>
  );

  return (
    <Screen>
      {/* Header with History Button */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: spacing(2), 
        paddingVertical: spacing(1),
        borderBottomWidth: 1,
        borderBottomColor: colors.border
      }}>
        <TouchableOpacity 
          onPress={() => {
            // Open crisis resources
            try {
              // Basic link; could be a local screen later
              const url = 'https://988lifeline.org/';
              // Lazy import to avoid top-level dependency
              require('react-native').Linking.openURL(url);
            } catch {}
          }}
          style={{
            padding: spacing(1),
            borderRadius: 8,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <CustomText style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
            Need help?
          </CustomText>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CustomText style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
            Dream Analyst
          </CustomText>
        </View>
        
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Wellness disclaimer modal */}
        <Modal visible={showDisclaimer} transparent animationType="fade" onRequestClose={() => setShowDisclaimer(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <Card style={{ maxWidth: '90%', backgroundColor: colors.card }}>
              <CustomText style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing(1) }}>
                Wellness Notice
              </CustomText>
              <CustomText style={{ color: colors.text }}>
                This app provides dream and mood insights for wellness and self-reflection. It does not offer medical or mental health advice. If you need immediate help, contact local emergency services or visit 988lifeline.org.
              </CustomText>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing(2), gap: spacing(1) }}>
                <Button title="Got it" onPress={async () => {
                  try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.setItem('seen_wellness_disclaimer', 'true');
                  } catch {}
                  setShowDisclaimer(false);
                }} />
              </View>
            </Card>
          </View>
        </Modal>
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
                    <Card key={index} style={{ 
                      marginBottom: spacing(1), 
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border
                    }}>
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

          {/* Unified AI actions remaining message (monthly pool) */}
          {!billing?.isPremium && (
            <InlineUpgradePrompt
              limitType="ai_actions"
              currentUsage={billing?.getAiActionsUsed?.() || 0}
              limit={billing?.AI_ACTIONS_LIMIT || 10}
              period="month"
            />
          )}

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
              disabled={busy || !message.trim() || !billingLoaded}
              style={{
                backgroundColor: (busy || !billingLoaded) ? colors.buttonDisabled : colors.primary,
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2)
              }}
            >
              <CustomText style={{ color: 'white', fontWeight: '600' }}>
                {busy ? '...' : (!billingLoaded ? 'Loading...' : 'Send')}
              </CustomText>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* History UI removed per requirements */}
    </Screen>
  );
}


