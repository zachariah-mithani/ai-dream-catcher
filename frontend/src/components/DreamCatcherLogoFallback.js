import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DreamCatcherLogoFallback({ size = 80, style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={['#fce7f3', '#e0e7ff', '#fef3c7']}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#8b5cf6',
          shadowOpacity: 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10
        }}
      >
        {/* Simple text-based dream catcher representation */}
        <Text style={{ 
          fontSize: size * 0.6, 
          color: '#ffffff',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          ☁️
        </Text>
      </LinearGradient>
    </View>
  );
}
