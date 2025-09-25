import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, updateProfile } from '../api';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const profile = await getProfile();
      setTheme(profile.theme_preference || 'dark');
    } catch (e) {
      console.log('Failed to load theme:', e.message);
      // Fallback to stored user data
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      setTheme(user?.theme_preference || 'dark');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    console.log('Toggling theme from', theme, 'to', newTheme);
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

  const colors = {
    light: {
      background: '#ffffff',
      surface: '#f8fafc',
      card: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      primary: '#22c55e',
      accent: '#3b82f6',
      error: '#ef4444',
      border: '#e2e8f0',
      input: '#f1f5f9',
      switchTrack: { false: '#cbd5e1', true: '#22c55e' },
      switchThumb: '#ffffff'
    },
    dark: {
      background: '#0b1220',
      surface: '#0f172a',
      card: '#1f2937',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      primary: '#22c55e',
      accent: '#3b82f6',
      error: '#ef4444',
      border: '#374151',
      input: '#374151',
      switchTrack: { false: '#374151', true: '#22c55e' },
      switchThumb: '#ffffff'
    }
  };

  const spacing = (multiplier) => multiplier * 8;

  const value = {
    theme,
    colors: colors[theme],
    spacing,
    toggleTheme,
    loading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
