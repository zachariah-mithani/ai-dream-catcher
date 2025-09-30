import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function CollapsibleTimePicker({ 
  label, 
  hour, 
  minute, 
  onHourChange, 
  onMinuteChange 
}) {
  const { colors, spacing } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const formatTime = (h, m) => {
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const adjustHour = (direction) => {
    let newHour = hour + direction;
    if (newHour < 0) newHour = 23;
    if (newHour > 23) newHour = 0;
    onHourChange(newHour);
  };

  const adjustMinute = (direction) => {
    let newMinute = minute + direction;
    if (newMinute < 0) newMinute = 59;
    if (newMinute > 59) newMinute = 0;
    onMinuteChange(newMinute);
  };

  const heightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

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
      
      <TouchableOpacity
        onPress={toggleExpanded}
        style={{
          backgroundColor: colors.input,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: spacing(2),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Text style={{ 
          color: colors.text, 
          fontSize: 16,
          fontWeight: '500'
        }}>
          {formatTime(hour, minute)}
        </Text>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>

      <Animated.View style={{ 
        height: heightInterpolate,
        overflow: 'hidden'
      }}>
        <View style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderTopWidth: 0,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          padding: spacing(2)
        }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-around',
            alignItems: 'center'
          }}>
            {/* Hour Selector */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: colors.textSecondary, 
                fontSize: 11, 
                marginBottom: spacing(0.75) 
              }}>
                Hour
              </Text>
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => adjustHour(1)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing(0.75)
                  }}
                >
                  <Ionicons name="chevron-up" size={14} color={colors.primaryText} />
                </TouchableOpacity>
                
                <Text style={{ 
                  color: colors.text, 
                  fontSize: 16, 
                  fontWeight: '600',
                  marginVertical: spacing(0.75)
                }}>
                  {hour.toString().padStart(2, '0')}
                </Text>
                
                <TouchableOpacity
                  onPress={() => adjustHour(-1)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: spacing(0.75)
                  }}
                >
                  <Ionicons name="chevron-down" size={14} color={colors.primaryText} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ 
              color: colors.text, 
              fontSize: 20, 
              fontWeight: '600',
              marginHorizontal: spacing(1)
            }}>
              :
            </Text>

            {/* Minute Selector */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: colors.textSecondary, 
                fontSize: 11, 
                marginBottom: spacing(0.75) 
              }}>
                Minute
              </Text>
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => adjustMinute(1)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing(0.75)
                  }}
                >
                  <Ionicons name="chevron-up" size={14} color={colors.primaryText} />
                </TouchableOpacity>
                
                <Text style={{ 
                  color: colors.text, 
                  fontSize: 16, 
                  fontWeight: '600',
                  marginVertical: spacing(0.75)
                }}>
                  {minute.toString().padStart(2, '0')}
                </Text>
                
                <TouchableOpacity
                  onPress={() => adjustMinute(-1)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: spacing(0.75)
                  }}
                >
                  <Ionicons name="chevron-down" size={14} color={colors.primaryText} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {/* Down arrow for easier access */}
          <View style={{ alignItems: 'center', marginTop: spacing(1) }}>
            <TouchableOpacity
              onPress={toggleExpanded}
              style={{
                backgroundColor: colors.input,
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border
              }}
            >
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
