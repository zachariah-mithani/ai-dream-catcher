import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function DreamCatcherLogo({ size = 80, style }) {
  const { theme } = useTheme();
  
  // Choose icon based on theme
  const getIconSource = () => {
    console.log('DreamCatcherLogo theme:', theme); // Debug log
    switch (theme) {
      case 'minimalistLight':
        console.log('Using light-in-app-icon.png for light theme');
        return require('../../assets/light-in-app-icon.png');
      case 'minimalistBlack':
        console.log('Using in-app-icon.png for dark theme');
        return require('../../assets/in-app-icon.png'); // Use the white icon for dark theme
      case 'dreamy':
      default:
        console.log('Using in-app-icon.png for dreamy theme');
        return require('../../assets/in-app-icon.png'); // Use the white icon for dreamy theme
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