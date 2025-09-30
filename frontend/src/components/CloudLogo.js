import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CloudLogo({ size = 80, style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={['#fef3c7', '#fce7f3', '#e0e7ff']}
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
        {/* Cloud shape */}
        <View
          style={{
            width: size * 0.6,
            height: size * 0.4,
            backgroundColor: '#ffffff',
            borderRadius: size * 0.3,
            shadowColor: '#8b5cf6',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
            position: 'relative'
          }}
        >
          {/* Cloud bumps */}
          <View
            style={{
              position: 'absolute',
              top: -size * 0.15,
              left: size * 0.1,
              width: size * 0.2,
              height: size * 0.2,
              backgroundColor: '#ffffff',
              borderRadius: size * 0.1,
              shadowColor: '#8b5cf6',
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: -size * 0.1,
              right: size * 0.1,
              width: size * 0.15,
              height: size * 0.15,
              backgroundColor: '#ffffff',
              borderRadius: size * 0.075,
              shadowColor: '#8b5cf6',
              shadowOpacity: 0.2,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3
            }}
          />
        </View>
      </LinearGradient>
    </View>
  );
}
