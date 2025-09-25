import React, { useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout, getProfile } from '../api';
import { Screen, Card, Text, Button, Subtle } from '../ui/components';
import { spacing } from '../ui/Theme';
import MoodTracker from '../components/MoodTracker';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({
    email: '',
    first_name: '',
    last_name: '',
    username: '',
    theme_preference: 'dark'
  });
  const [loggingOut, setLoggingOut] = useState(false);
  
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (e) {
      console.log('Failed to load profile:', e.message);
      // Fallback to stored user data
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      setProfile(prev => ({
        ...prev,
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        username: user?.username || '',
        theme_preference: user?.theme_preference || 'dark'
      }));
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      // The App component will automatically detect the missing token and switch to login
      // No need to manually navigate
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } finally {
      setLoggingOut(false);
    }
  };


  const getDisplayName = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile.first_name) {
      return profile.first_name;
    } else if (profile.username) {
      return `@${profile.username}`;
    }
    return profile.email;
  };

  return (
    <Screen style={{ paddingHorizontal: spacing(2) }}>
      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Profile</Text>
        <Text style={{ color: 'white', fontSize: 16, marginBottom: 4 }}>{getDisplayName()}</Text>
        <Subtle style={{ marginBottom: 12 }}>{profile.email}</Subtle>
        
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Button 
            title="Settings" 
            onPress={() => navigation.navigate('Settings')}
            style={{ flex: 1, backgroundColor: '#3b82f6' }}
          />
          <Button 
            kind="danger" 
            title={loggingOut ? "Logging out..." : "Log out"} 
            onPress={onLogout}
            disabled={loggingOut}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <MoodTracker />

    </Screen>
  );
}


