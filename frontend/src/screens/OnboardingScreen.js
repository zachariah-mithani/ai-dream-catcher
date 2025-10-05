import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { Screen, Card, Button, Text as Txt } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { api, createCheckoutSession, upgradePlan } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DreamCatcherLogo from '../components/DreamCatcherLogo';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: "Do you ever wonder what your dreams mean?",
    subtitle: "Dreams are windows into your subconscious mind",
    description: "Every night, your mind creates stories, symbols, and emotions that can reveal insights about your inner world.",
    emoji: "🌙",
    color: "#3b82f6"
  },
  {
    id: 2,
    title: "Track Your Dream Journey",
    subtitle: "Log dreams with AI-powered analysis",
    description: "Record your dreams and get instant psychological insights, symbolic interpretations, and pattern recognition.",
    emoji: "📝",
    color: "#22c55e"
  },
  {
    id: 3,
    title: "Discover Hidden Patterns",
    subtitle: "Understand your dream themes over time",
    description: "Track recurring symbols, emotions, and themes to better understand your mental and emotional patterns.",
    emoji: "🔍",
    color: "#8b5cf6"
  },
  {
    id: 4,
    title: "Chat with Your Dream Analyst",
    subtitle: "Get personalized dream insights",
    description: "Ask questions about your dreams and receive thoughtful, personalized interpretations from our AI dream analyst.",
    emoji: "💬",
    color: "#f59e0b"
  },
  {
    id: 5,
    title: "Choose your plan",
    subtitle: "Start free or unlock everything",
    description: "Free: limited monthly usage. Dream Explorer+: unlimited entries, edits, chat, trends.",
    emoji: "⭐",
    color: "#ef4444"
  }
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, spacing, theme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * width,
        animated: true
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      if (selectedPlan === 'premium') {
        try {
          // Prefer sending the user to Stripe Checkout from onboarding
          const { sessionUrl } = await createCheckoutSession('monthly', 7);
          // If running on device, open external URL
          const { Linking } = require('react-native');
          await Linking.openURL(sessionUrl);
        } catch {
          // Fallback: mark plan upgrade via API if checkout creation fails
          await upgradePlan('premium', 7);
        }
      } else {
        try {
          await upgradePlan('free');
        } catch {}
      }
    } catch {}
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const renderSlide = (slide) => (
    <View key={slide.id} style={{ width, padding: spacing(1), justifyContent: 'center', alignItems: 'center' }}>
      <Card style={{ 
        backgroundColor: colors.card, 
        padding: spacing(3), 
        alignItems: 'center',
        minHeight: 400,
        justifyContent: 'center',
        width: '95%'
      }}>
        {slide.id === 1 ? (
          <View style={{ marginBottom: spacing(3) }}>
            {theme === 'dreamy' ? (
              <Image
                source={require('../../assets/light-icon.png')}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
              />
            ) : (
              <DreamCatcherLogo size={120} />
            )}
          </View>
        ) : (
          <Text style={{ fontSize: 80, marginBottom: spacing(3) }}>
            {slide.emoji}
          </Text>
        )}
        
        <Text style={{ 
          color: colors.text, 
          fontSize: 28, 
          fontWeight: '800', 
          textAlign: 'center',
          marginBottom: spacing(2)
        }}>
          {slide.title}
        </Text>
        
        <Text style={{ 
          color: slide.color, 
          fontSize: 18, 
          fontWeight: '600', 
          textAlign: 'center',
          marginBottom: spacing(3)
        }}>
          {slide.subtitle}
        </Text>
        
        {slide.id !== 5 ? (
          <Text style={{ 
            color: colors.textSecondary, 
            fontSize: 16, 
            textAlign: 'center',
            lineHeight: 24
          }}>
            {slide.description}
          </Text>
        ) : (
          <ScrollView style={{ width: '100%', maxHeight: 440 }} contentContainerStyle={{ paddingBottom: spacing(2) }} nestedScrollEnabled>
            {/* Plan comparison */}
            <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: spacing(2) }}>
              Compare Free vs Dream Explorer+
            </Text>
            {/* Compact table that fits smaller screens */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: spacing(2) }}>
              <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                <Text style={{ flex: 2, color: colors.textSecondary, padding: 10, fontWeight: '700' }}>Feature</Text>
                <Text style={{ width: 100, color: colors.textSecondary, padding: 10, textAlign: 'center', borderTopRightRadius: 12 }}>Free</Text>
                <Text style={{ width: 100, color: colors.textSecondary, padding: 10, textAlign: 'center', borderTopRightRadius: 12 }}>Plus</Text>
              </View>
              <View style={{ maxHeight: 260 }}>
                {/* Scroll features vertically if needed */}
                <View>
                  {[
                    'Unlimited entries & edits',
                    'Advanced AI interpretations',
                    'Dream Analyst chat (memory)',
                    'History & global search',
                    'Trends over time',
                    'Reports & export (PDF/CSV)'
                  ].map((label, idx) => (
                    <View key={idx} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      borderTopWidth: 1, 
                      borderTopColor: colors.border,
                      ...(idx === 5 && { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 })
                    }}>
                      <Text style={{ flex: 2, color: colors.text, paddingVertical: 10, paddingHorizontal: 10, fontSize: 14 }}>{label}</Text>
                      <Text style={{ width: 100, textAlign: 'center', color: '#ef4444', fontSize: 16 }}>✕</Text>
                      <Text style={{ width: 100, textAlign: 'center', color: '#22c55e', fontSize: 16 }}>✓</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Billing period toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 4, alignSelf: 'center', marginBottom: spacing(2) }}>
              {['monthly','yearly'].map(p => (
                <TouchableOpacity key={p} onPress={() => setBillingPeriod(p)} style={{ backgroundColor: billingPeriod===p?colors.primary: 'transparent', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 }}>
                  <Text style={{ color: billingPeriod===p? colors.primaryText : colors.text }}>{p==='monthly'?'Monthly':'Yearly'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price and CTAs */}
            <View style={{ alignItems: 'center', marginBottom: spacing(1) }}>
              {billingPeriod === 'yearly' ? (
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>$49.99/yr <Text style={{ color: '#22c55e', fontSize: 14 }}>(7‑day trial)</Text></Text>
              ) : (
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>$6.99/mo <Text style={{ color: '#22c55e', fontSize: 14 }}>(7‑day trial)</Text></Text>
              )}
            </View>

            <Button 
              title={selectedPlan === 'premium' ? '✓ Continue – Dream Explorer+' : 'Continue – Dream Explorer+'}
              onPress={() => { setSelectedPlan('premium'); }}
              style={{ marginBottom: spacing(1), backgroundColor: colors.primary }}
            />
            <Button 
              title={selectedPlan === 'free' ? '✓ Continue – Free (limited)' : 'Continue – Free (limited)'}
              onPress={() => { setSelectedPlan('free'); }}
              kind="secondary"
            />
          </ScrollView>
        )}
      </Card>
    </View>
  );

  const renderDots = () => (
    <View style={{ 
      flexDirection: 'row', 
      justifyContent: 'center', 
      marginTop: spacing(3),
      marginBottom: spacing(2)
    }}>
      {SLIDES.map((_, index) => (
        <View
          key={index}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: index === currentSlide ? colors.primary : colors.border,
            marginHorizontal: 4
          }}
        />
      ))}
    </View>
  );

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map(renderSlide)}
      </ScrollView>

      {renderDots()}

      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingHorizontal: spacing(3),
        paddingBottom: spacing(4)
      }}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={{ 
            color: colors.textSecondary, 
            fontSize: 16,
            fontWeight: '600'
          }}>
            Skip
          </Text>
        </TouchableOpacity>

        <Button
          title={currentSlide === SLIDES.length - 1 ? "Get Started" : "Next"}
          onPress={handleNext}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: spacing(4),
            paddingVertical: spacing(2)
          }}
        />
      </View>
    </Screen>
  );
}
