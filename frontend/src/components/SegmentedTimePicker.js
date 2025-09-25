import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function SegmentedTimePicker({ 
  label, 
  hour, 
  minute, 
  onHourChange, 
  onMinuteChange 
}) {
  const { colors, spacing } = useTheme();

  const renderNumberSegment = (value, isSelected, onPress) => (
    <TouchableOpacity
      key={value}
      onPress={onPress}
      style={{
        paddingHorizontal: spacing(2),
        paddingVertical: spacing(1),
        backgroundColor: isSelected ? colors.primary : 'transparent',
        borderRadius: 8,
        marginRight: spacing(0.5),
        minWidth: 40,
        alignItems: 'center'
      }}
    >
      <Text style={{
        color: isSelected ? 'white' : colors.text,
        fontSize: 16,
        fontWeight: isSelected ? '600' : '400'
      }}>
        {value.toString().padStart(2, '0')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: spacing(2) }}>
      <Text style={{ 
        color: colors.text, 
        fontSize: 16, 
        fontWeight: '600',
        marginBottom: spacing(1) 
      }}>
        {label}
      </Text>
      
      <View style={{ marginBottom: spacing(1) }}>
        <Text style={{ 
          color: colors.textSecondary, 
          fontSize: 12, 
          marginBottom: spacing(0.5) 
        }}>
          Hour
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing(0.5) }}
        >
          {Array.from({ length: 24 }, (_, i) => 
            renderNumberSegment(
              i, 
              hour === i, 
              () => onHourChange(i)
            )
          )}
        </ScrollView>
      </View>
      
      <View>
        <Text style={{ 
          color: colors.textSecondary, 
          fontSize: 12, 
          marginBottom: spacing(0.5) 
        }}>
          Minute
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing(0.5) }}
        >
          {Array.from({ length: 60 }, (_, i) => 
            renderNumberSegment(
              i, 
              minute === i, 
              () => onMinuteChange(i)
            )
          )}
        </ScrollView>
      </View>
    </View>
  );
}
