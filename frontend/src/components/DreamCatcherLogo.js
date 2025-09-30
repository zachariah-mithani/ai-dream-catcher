import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';

export default function DreamCatcherLogo({ size = 80, style }) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const featherLength = size * 0.15;
  const featherWidth = size * 0.08;
  const beadSize = size * 0.04;

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
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Main hoop */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke="#ffffff"
            strokeWidth="3"
            fill="none"
          />
          
          {/* Inner web pattern - 8-pointed star */}
          <Path
            d={`M ${centerX} ${centerY - radius * 0.7} 
                L ${centerX + radius * 0.5} ${centerY - radius * 0.35}
                L ${centerX + radius * 0.7} ${centerY}
                L ${centerX + radius * 0.5} ${centerY + radius * 0.35}
                L ${centerX} ${centerY + radius * 0.7}
                L ${centerX - radius * 0.5} ${centerY + radius * 0.35}
                L ${centerX - radius * 0.7} ${centerY}
                L ${centerX - radius * 0.5} ${centerY - radius * 0.35}
                Z`}
            fill="#ffffff"
            stroke="#ffffff"
            strokeWidth="1"
          />
          
          {/* Center circle */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.15}
            fill="#ffffff"
          />
          
          {/* Dangling feathers */}
          {/* Left feather */}
          <Circle
            cx={centerX - radius * 0.3}
            cy={centerY + radius * 0.8}
            r={beadSize}
            fill="#ffffff"
          />
          <Ellipse
            cx={centerX - radius * 0.3}
            cy={centerY + radius * 0.8 + featherLength * 0.5}
            rx={featherWidth * 0.5}
            ry={featherLength * 0.8}
            fill="#ffffff"
            transform={`rotate(-15 ${centerX - radius * 0.3} ${centerY + radius * 0.8 + featherLength * 0.5})`}
          />
          
          {/* Center feather */}
          <Circle
            cx={centerX}
            cy={centerY + radius * 0.8}
            r={beadSize}
            fill="#ffffff"
          />
          <Ellipse
            cx={centerX}
            cy={centerY + radius * 0.8 + featherLength * 0.5}
            rx={featherWidth * 0.5}
            ry={featherLength * 0.8}
            fill="#ffffff"
          />
          
          {/* Right feather */}
          <Circle
            cx={centerX + radius * 0.3}
            cy={centerY + radius * 0.8}
            r={beadSize}
            fill="#ffffff"
          />
          <Ellipse
            cx={centerX + radius * 0.3}
            cy={centerY + radius * 0.8 + featherLength * 0.5}
            rx={featherWidth * 0.5}
            ry={featherLength * 0.8}
            fill="#ffffff"
            transform={`rotate(15 ${centerX + radius * 0.3} ${centerY + radius * 0.8 + featherLength * 0.5})`}
          />
        </Svg>
      </LinearGradient>
    </View>
  );
}
