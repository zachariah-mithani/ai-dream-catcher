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
  
  // Determine if this is a secondary button (unselected theme button)
  const isSecondary = style?.backgroundColor === colors.buttonSecondary;
  
  const palette = kind === 'danger' 
    ? { bg: colors.danger, text: '#fff' } 
    : isSecondary 
      ? { bg: colors.buttonSecondary, text: colors.buttonSecondaryText }
      : { bg: colors.primary, text: colors.primaryText };
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled}
      style={[
        { 
          backgroundColor: disabled ? colors.border : palette.bg, 
          paddingVertical: 12, 
          paddingHorizontal: 16, 
          borderRadius: borderRadius.medium, 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          ...shadow
        }, 
        style
      ]}
    >
      <RNText 
        style={{ 
          color: disabled ? colors.subtext : palette.text, 
          fontWeight: '800',
          fontSize: 14,
          textAlign: 'center'
        }}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.8}
      >
        {title}
      </RNText>
    </TouchableOpacity>
  );
}