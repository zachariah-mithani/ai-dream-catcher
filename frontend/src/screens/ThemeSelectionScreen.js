import React, { useState } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Screen, Card, Text, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import DreamCatcherLogo from '../components/DreamCatcherLogo';

export default function ThemeSelectionScreen({ onComplete }) {
  const { colors, spacing, changeTheme, availableThemes, theme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme || 'dreamy');
  const [saving, setSaving] = useState(false);

  const handleThemeSelect = async (themeKey) => {
    setSelectedTheme(themeKey);
    try {
      await changeTheme(themeKey); // apply immediately so the user sees it
    } catch (e) {
      console.log('Theme apply failed:', e.message);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Change theme and wait for it to complete
      await changeTheme(selectedTheme);
      // Add a small delay to ensure theme is applied
      await new Promise(resolve => setTimeout(resolve, 100));
      onComplete();
    } catch (error) {
      console.log('Failed to save theme:', error);
      // Continue anyway
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen style={{ justifyContent: 'center', padding: 24 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: spacing(4) }}>
          <View style={{ width: 120, height: 120 }}>
            <Image
              source={
                selectedTheme === 'dreamy' 
                  ? require('../../assets/in-app-icon.png')
                  : selectedTheme === 'minimalistLight'
                  ? require('../../assets/light-icon.png')
                  : require('../../assets/in-app-icon.png') // dark theme
              }
              style={{
                width: '100%',
                height: '100%',
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ 
            fontSize: 28, 
            fontWeight: '800', 
            marginTop: spacing(2),
            color: colors.text,
            textAlign: 'center'
          }}>
            Choose Your Theme
          </Text>
          <Subtle style={{ 
            fontSize: 16, 
            marginTop: spacing(1),
            textAlign: 'center'
          }}>
            Select the look and feel that speaks to you
          </Subtle>
        </View>
        
        <Card>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: '700', 
            marginBottom: spacing(2),
            textAlign: 'center'
          }}>
            Pick Your Style
          </Text>
          
          <View style={{ gap: spacing(2) }}>
            {availableThemes.map((themeOption) => {
              const isSelected = selectedTheme === themeOption.key;
              return (
                <Button
                  key={themeOption.key}
                  title={themeOption.name}
                  onPress={() => handleThemeSelect(themeOption.key)}
                  style={{
                    backgroundColor: isSelected ? colors.primary : (colors.buttonSecondary || colors.surface),
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    paddingVertical: spacing(2),
                    opacity: isSelected ? 1 : 0.95
                  }}
                />
              );
            })}
          </View>
          
          <Button
            title={saving ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={saving}
            style={{ 
              marginTop: spacing(3),
              backgroundColor: colors.accent
            }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
