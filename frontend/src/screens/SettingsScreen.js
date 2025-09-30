import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Switch } from 'react-native';
import { Screen, Text, Card, Input, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { getProfile, updateProfile, deleteAccount } from '../api';
import CollapsibleTimePicker from '../components/CollapsibleTimePicker';
import TermsScreen from './legal/TermsScreen';
import PrivacyScreen from './legal/PrivacyScreen';
import AboutScreen from './legal/AboutScreen';

export default function SettingsScreen({ navigation }) {
  const { theme, themeName, colors, spacing, changeTheme, availableThemes } = useTheme();
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    username: '',
    theme_preference: 'dark',
    bedtime_hour: 22,
    bedtime_minute: 0,
    wakeup_hour: 7,
    wakeup_minute: 0,
    notifications_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        username: data.username || '',
        theme_preference: data.theme_preference || 'dark',
        bedtime_hour: data.bedtime_hour || 22,
        bedtime_minute: data.bedtime_minute || 0,
        wakeup_hour: data.wakeup_hour || 7,
        wakeup_minute: data.wakeup_minute || 0,
        notifications_enabled: data.notifications_enabled !== false
      });
    } catch (e) {
      console.log('Failed to load profile:', e.message);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updates = {};
      if (profile.first_name?.trim()) updates.first_name = profile.first_name.trim();
      if (profile.last_name?.trim()) updates.last_name = profile.last_name.trim();
      if (profile.username?.trim()) updates.username = profile.username.trim();
      if (profile.theme_preference) updates.theme_preference = profile.theme_preference;
      if (profile.bedtime_hour !== undefined) updates.bedtime_hour = profile.bedtime_hour;
      if (profile.bedtime_minute !== undefined) updates.bedtime_minute = profile.bedtime_minute;
      if (profile.wakeup_hour !== undefined) updates.wakeup_hour = profile.wakeup_hour;
      if (profile.wakeup_minute !== undefined) updates.wakeup_minute = profile.wakeup_minute;
      if (profile.notifications_enabled !== undefined) updates.notifications_enabled = profile.notifications_enabled;
      
      const updated = await updateProfile(updates);
      setProfile(prev => ({ ...prev, ...updated }));
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) {
      console.log('Failed to update profile:', e.message);
      Alert.alert('Error', e.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your dream data. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: confirmDeleteAccount
                }
              ]
            );
          }
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      // The App component will automatically detect the missing token and switch to login
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleNotificationToggle = async (value) => {
    setProfile(prev => ({
      ...prev,
      notifications_enabled: value
    }));
    
    try {
      await updateProfile({ notifications_enabled: value });
    } catch (e) {
      console.log('Failed to save notification preference:', e.message);
      setProfile(prev => ({
        ...prev,
        notifications_enabled: !value
      }));
    }
  };


  if (loading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>Loading settings...</Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing(2) }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16 }}>
          Settings
        </Text>
        <Card style={{ marginBottom: spacing(2) }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing(1) }}>Security</Text>
          <Button title="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
        </Card>

        <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
            Profile Information
          </Text>
          
          <Input
            placeholder="First Name"
            value={profile.first_name || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, first_name: text }))}
            style={{ marginBottom: spacing(1) }}
          />
          
          <Input
            placeholder="Last Name"
            value={profile.last_name || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, last_name: text }))}
            style={{ marginBottom: spacing(1) }}
          />
          
          <Input
            placeholder="Username"
            value={profile.username || ''}
            onChangeText={(text) => setProfile(prev => ({ ...prev, username: text }))}
            style={{ marginBottom: spacing(2) }}
          />
          
          <Button
            title={saving ? 'Saving...' : 'Save Profile'}
            onPress={saveProfile}
            disabled={saving}
            style={{ 
              backgroundColor: saving ? '#6b7280' : colors.primary,
              opacity: saving ? 0.7 : 1
            }}
          />
        </Card>

        <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
            Themes
          </Text>
          
          <Text style={{ color: colors.text, fontSize: 16, marginBottom: spacing(1) }}>
            Current: {themeName}
          </Text>
          <Subtle style={{ marginBottom: spacing(2) }}>
            Choose your preferred theme
          </Subtle>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) }}>
            {availableThemes.map((themeOption) => (
              <Button
                key={themeOption.key}
                title={themeOption.name}
                onPress={() => changeTheme(themeOption.key)}
                style={{
                  backgroundColor: theme === themeOption.key ? colors.primary : (colors.buttonSecondary || colors.surface),
                  borderWidth: theme === themeOption.key ? 2 : 1,
                  borderColor: theme === themeOption.key ? colors.primary : colors.border,
                  flex: 1,
                  minWidth: 100
                }}
              />
            ))}
          </View>
        </Card>

        <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
            Sleep Schedule
          </Text>
          
          <CollapsibleTimePicker
            label="Bedtime"
            hour={profile.bedtime_hour}
            minute={profile.bedtime_minute}
            onHourChange={async (hour) => {
              setProfile(prev => ({ ...prev, bedtime_hour: hour }));
              try {
                await updateProfile({ bedtime_hour: hour });
              } catch (e) {
                console.log('Failed to save bedtime hour:', e.message);
              }
            }}
            onMinuteChange={async (minute) => {
              setProfile(prev => ({ ...prev, bedtime_minute: minute }));
              try {
                await updateProfile({ bedtime_minute: minute });
              } catch (e) {
                console.log('Failed to save bedtime minute:', e.message);
              }
            }}
          />
          
          <CollapsibleTimePicker
            label="Wake-up Time"
            hour={profile.wakeup_hour}
            minute={profile.wakeup_minute}
            onHourChange={async (hour) => {
              setProfile(prev => ({ ...prev, wakeup_hour: hour }));
              try {
                await updateProfile({ wakeup_hour: hour });
              } catch (e) {
                console.log('Failed to save wakeup hour:', e.message);
              }
            }}
            onMinuteChange={async (minute) => {
              setProfile(prev => ({ ...prev, wakeup_minute: minute }));
              try {
                await updateProfile({ wakeup_minute: minute });
              } catch (e) {
                console.log('Failed to save wakeup minute:', e.message);
              }
            }}
          />
          
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing(1) }}>
            Notifications will be sent at your wake-up time to remind you to log your dreams.
          </Text>
        </Card>

        <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
            Notifications
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: spacing(1)
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, marginBottom: 4 }}>
                Dream Reminders
              </Text>
              <Subtle>Get notified to log your dreams when you wake up</Subtle>
            </View>
            <Switch
              value={profile.notifications_enabled}
              onValueChange={handleNotificationToggle}
              trackColor={colors.switchTrack}
              thumbColor={colors.switchThumb}
            />
          </View>
        </Card>

            <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>Legal & About</Text>
              <View style={{ flexDirection: 'row', gap: spacing(1) }}>
                <Button title="Terms" onPress={() => navigation.navigate('Terms')} style={{ flex: 1 }} />
                <Button title="Privacy" onPress={() => navigation.navigate('Privacy')} style={{ flex: 1 }} />
                <Button title="About" onPress={() => navigation.navigate('About')} style={{ flex: 1 }} />
              </View>
            </Card>

        <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
            Account Actions
          </Text>
          
          <Button
            title={deletingAccount ? "Deleting Account..." : "Delete Account & Data"}
            onPress={onDeleteAccount}
            disabled={deletingAccount}
            kind="danger"
            style={{ 
              backgroundColor: deletingAccount ? '#6b7280' : '#dc2626',
              marginBottom: spacing(1)
            }}
          />
          
          <Subtle style={{ fontSize: 12 }}>
            This will permanently delete your account, all dreams, moods, and analysis data.
          </Subtle>
        </Card>
      </ScrollView>
    </Screen>
  );
}