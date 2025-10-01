import React from 'react';
import { View, Image } from 'react-native';

export default function DreamCatcherLogo({ size = 80, style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={require('../../assets/in-app-icon.png')}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="contain"
      />
    </View>
  );
}