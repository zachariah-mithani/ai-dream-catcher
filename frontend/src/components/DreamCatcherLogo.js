import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function DreamCatcherLogo({ size = 80, style }) {
  const { theme } = useTheme();
  
  // Choose icon based on theme
  const getIconSource = () => {
    switch (theme) {
      case 'minimalistLight':
        return require('../../assets/light-icon.png');
      case 'minimalistBlack':
        return require('../../assets/in-app-icon.png'); // Use the white icon for dark theme
      case 'dreamy':
      default:
        return require('../../assets/in-app-icon.png'); // Use the in-app icon for dreamy theme
    }
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={getIconSource()}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="contain"
      />
    </View>
  );
}