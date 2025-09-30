import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DreamCatcherLogo({ size = 80, style }) {
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
        {/* Simple dream catcher representation using text and shapes */}
        <View style={{
          width: size * 0.7,
          height: size * 0.7,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Main hoop - using a circular border */}
          <View style={{
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: size * 0.3,
            borderWidth: 3,
            borderColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}>
            {/* Inner web pattern - using text symbols */}
            <Text style={{
              fontSize: size * 0.3,
              color: '#ffffff',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ✨
            </Text>
          </View>
          
          {/* Dangling feathers */}
          <View style={{
            position: 'absolute',
            bottom: -size * 0.1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: size * 0.5,
            alignItems: 'flex-end'
          }}>
            <Text style={{ fontSize: size * 0.15, color: '#ffffff' }}>🪶</Text>
            <Text style={{ fontSize: size * 0.15, color: '#ffffff' }}>🪶</Text>
            <Text style={{ fontSize: size * 0.15, color: '#ffffff' }}>🪶</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}