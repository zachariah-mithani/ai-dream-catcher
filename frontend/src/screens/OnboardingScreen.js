import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Screen, Card, Button } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CloudLogo from '../components/CloudLogo';

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
    title: "Ready to Explore Your Dreams?",
    subtitle: "Start your journey of self-discovery",
    description: "Begin logging your dreams today and unlock the mysteries of your subconscious mind.",
    emoji: "✨",
    color: "#ef4444"
  }
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, spacing } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);

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
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const renderSlide = (slide) => (
    <View key={slide.id} style={{ width, padding: spacing(3), justifyContent: 'center', alignItems: 'center' }}>
      <Card style={{ 
        backgroundColor: colors.card, 
        padding: spacing(4), 
        alignItems: 'center',
        minHeight: 400,
        justifyContent: 'center'
      }}>
        {slide.id === 1 ? (
          <CloudLogo size={120} style={{ marginBottom: spacing(3) }} />
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
        
        <Text style={{ 
          color: colors.textSecondary, 
          fontSize: 16, 
          textAlign: 'center',
          lineHeight: 24
        }}>
          {slide.description}
        </Text>
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
