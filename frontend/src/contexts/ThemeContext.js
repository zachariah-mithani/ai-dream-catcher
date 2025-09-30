import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, updateProfile } from '../api';
import { themes, spacing, getShadow, borderRadius } from '../ui/Theme';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dreamy');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const profile = await getProfile();
      setTheme(profile.theme_preference || 'dreamy');
    } catch (e) {
      console.log('Failed to load theme:', e.message);
      // Fallback to stored user data
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      setTheme(user?.theme_preference || 'dreamy');
    } finally {
      setLoading(false);
    }
  };

  const changeTheme = async (newTheme) => {
    console.log('Changing theme to:', newTheme);
    setTheme(newTheme);
    
    try {
      await updateProfile({ theme_preference: newTheme });
      // Update local storage
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : {};
      await AsyncStorage.setItem('user', JSON.stringify({ ...user, theme_preference: newTheme }));
      console.log('Theme saved successfully:', newTheme);
    } catch (e) {
      console.log('Failed to save theme preference:', e.message);
      // Revert on error
      setTheme(theme);
    }
  };

  const currentTheme = themes[theme] || themes.dreamy;
  const value = {
    theme,
    themeName: currentTheme.name,
    colors: currentTheme.colors,
    gradients: currentTheme.gradients,
    spacing,
    shadow: getShadow(theme),
    borderRadius,
    changeTheme,
    availableThemes: Object.keys(themes).map(key => ({
      key,
      name: themes[key].name
    })),
    loading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
