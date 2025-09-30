import React from 'react';
import { View, Text as RNText, TextInput as RNInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export function Screen({ children, style }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, gradients } = useTheme();
  return (
    <LinearGradient
      colors={gradients.background}
      style={[
        { 
          flex: 1, 
          paddingTop: insets.top + 16, 
          paddingBottom: insets.bottom + 16 
        }, 
        style
      ]}
    >
      {children}
    </LinearGradient>
  );
}

export function Card({ children, style }) {
  const { colors, spacing, borderRadius, shadow } = useTheme();
  return (
    <View style={[
      { 
        backgroundColor: colors.card, 
        borderRadius: borderRadius.large, 
        padding: spacing(3),
        ...shadow,
        borderWidth: 1,
        borderColor: colors.border
      }, 
      style
    ]}>
      {children}
    </View>
  );
}

export function Text({ children, style }) {
  const { colors } = useTheme();
  return (
    <RNText style={[{ color: colors.text, fontSize: 16 }, style]}>
      {children}
    </RNText>
  );
}

export function Subtle({ children, style }) {
  const { colors } = useTheme();
  return (
    <RNText style={[{ color: colors.textSecondary, fontSize: 14 }, style]}>
      {children}
    </RNText>
  );
}

export function Input(props) {
  const { colors, borderRadius } = useTheme();
  return (
    <RNInput 
      {...props} 
      placeholderTextColor={colors.subtext} 
      style={[
        { 
          backgroundColor: colors.surface, 
          color: colors.text, 
          padding: 16, 
          borderRadius: borderRadius.medium, 
          borderWidth: 2, 
          borderColor: colors.border,
          fontSize: 16
        }, 
        props.style
      ]} 
    />
  );
}

export function Button({ title, onPress, style, kind = 'primary', disabled = false }) {
  const { colors, borderRadius, gradients, shadow } = useTheme();
  const palette = kind === 'danger' ? { bg: colors.danger, text: '#fff' } : { bg: colors.primary, text: '#fff' };
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled}
      style={[
        { 
          backgroundColor: disabled ? colors.border : palette.bg, 
          paddingVertical: 16, 
          paddingHorizontal: 24, 
          borderRadius: borderRadius.medium, 
          alignItems: 'center',
          ...shadow
        }, 
        style
      ]}
    >
      <RNText style={{ 
        color: disabled ? colors.subtext : palette.text, 
        fontWeight: '800',
        fontSize: 16
      }}>
        {title}
      </RNText>
    </TouchableOpacity>
  );
}