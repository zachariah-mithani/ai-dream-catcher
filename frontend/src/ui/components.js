import React from 'react';
import { View, Text as RNText, TextInput as RNInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export function Screen({ children, style }) {
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  return (
    <View style={[
      { 
        flex: 1, 
        backgroundColor: colors.background, 
        paddingTop: insets.top + 16, 
        paddingBottom: insets.bottom + 16 
      }, 
      style
    ]}>
      {children}
    </View>
  );
}

export function Card({ children, style }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[
      { 
        backgroundColor: colors.card, 
        borderRadius: 16, 
        padding: spacing(2),
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
  const { colors } = useTheme();
  return (
    <RNInput 
      {...props} 
      placeholderTextColor={colors.textSecondary} 
      style={[
        { 
          backgroundColor: colors.input, 
          color: colors.text, 
          padding: 14, 
          borderRadius: 12, 
          borderWidth: 1, 
          borderColor: colors.border 
        }, 
        props.style
      ]} 
    />
  );
}

export function Button({ title, onPress, style, kind = 'primary' }) {
  const { colors } = useTheme();
  const palette = kind === 'danger' ? { bg: colors.error, text: '#fff' } : { bg: colors.primary, text: '#fff' };
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        { 
          backgroundColor: palette.bg, 
          paddingVertical: 14, 
          paddingHorizontal: 18, 
          borderRadius: 12, 
          alignItems: 'center' 
        }, 
        style
      ]}
    >
      <RNText style={{ color: palette.text, fontWeight: '800' }}>
        {title}
      </RNText>
    </TouchableOpacity>
  );
}