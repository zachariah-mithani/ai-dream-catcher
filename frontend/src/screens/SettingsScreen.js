import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Switch, Modal } from 'react-native';
import { Screen, Text, Card, Input, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { getProfile, updateProfile, deleteAccount, upgradePlan } from '../api';
import CollapsibleTimePicker from '../components/CollapsibleTimePicker';
import TermsScreen from './legal/TermsScreen';
import PrivacyScreen from './legal/PrivacyScreen';
import AboutScreen from './legal/AboutScreen';
import { rescheduleAllReminders } from '../utils/notifications';
import { useBilling } from '../contexts/BillingContext';

export default function SettingsScreen({ navigation }) {
  const { theme, themeName, colors, spacing, changeTheme, availableThemes } = useTheme();
  const billing = useBilling();
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    username: '',
    theme_preference: 'minimalistBlack',
    bedtime_hour: 22,
    bedtime_minute: 0,
    wakeup_hour: 7,
    wakeup_minute: 0,
    notifications_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
      // Reschedule notifications after successful save
      try {
        await rescheduleAllReminders({
          notifications_enabled: updated.notifications_enabled ?? profile.notifications_enabled,
          bedtime_hour: updated.bedtime_hour ?? profile.bedtime_hour,
          bedtime_minute: updated.bedtime_minute ?? profile.bedtime_minute,
          wakeup_hour: updated.wakeup_hour ?? profile.wakeup_hour,
          wakeup_minute: updated.wakeup_minute ?? profile.wakeup_minute,
        });
      } catch (e) {
        console.log('Failed to reschedule notifications on save:', e.message);
      }
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
      'This will permanently delete your account and all your dream data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          style: 'destructive',
          onPress: () => setShowDeleteConfirm(true)
        }
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      Alert.alert('Success', 'Your account has been deleted successfully.', [
        { text: 'OK', onPress: () => {
          // The App component will automatically detect the missing token and switch to login
        }}
      ]);
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
      const updated = await updateProfile({ notifications_enabled: value });
      // Reflect any server canonical values
      setProfile(prev => ({ ...prev, ...updated }));
      try {
        await rescheduleAllReminders({
          notifications_enabled: updated.notifications_enabled ?? value,
          bedtime_hour: updated.bedtime_hour ?? profile.bedtime_hour,
          bedtime_minute: updated.bedtime_minute ?? profile.bedtime_minute,
          wakeup_hour: updated.wakeup_hour ?? profile.wakeup_hour,
          wakeup_minute: updated.wakeup_minute ?? profile.wakeup_minute,
        });
      } catch (e) {
        console.log('Failed to reschedule after toggle:', e.message);
      }
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
        {/* Move change password near bottom; remove this top Security card */}

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
            autoCapitalize='none'
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

        {/* Delete confirmation modal with text input */}
        <Modal
          transparent
          visible={showDeleteConfirm}
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing(2) }}>
            <Card style={{ padding: spacing(3) }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: spacing(1) }}>Final Confirmation</Text>
              <Subtle style={{ marginBottom: spacing(2) }}>Type "DELETE" to confirm account deletion</Subtle>
              <Input
                autoCapitalize='characters'
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type DELETE"
                style={{ marginBottom: spacing(2) }}
              />
              <View style={{ flexDirection: 'row', gap: spacing(1) }}>
                <Button
                  title="Cancel"
                  onPress={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  style={{ flex: 1, backgroundColor: colors.buttonSecondary }}
                />
                <Button
                  title="Confirm Delete"
                  onPress={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); confirmDeleteAccount(); }}
                  disabled={deleteConfirmText.trim() !== 'DELETE' || deletingAccount}
                  kind="danger"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

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

        {/* Subscription */}
        <Card style={{ marginBottom: spacing(2), backgroundColor: colors.card }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing(2) }}>
            Subscription
          </Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing(1) }}>
            Current plan: {billing?.isPremium ? 'Dream Explorer+' : 'Free'}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing(1) }}>
            <Button title="Manage Plan" onPress={async () => { await billing?.refresh?.(); navigation.navigate('Billing'); }} style={{ flex: 1 }} />
            {billing?.isPremium ? (
              <Button 
                title="Switch to Free" 
                kind="secondary" 
                onPress={async () => { 
                  try { 
                    await upgradePlan('free'); 
                    await billing?.refresh?.(); 
                    Alert.alert('Success', 'Switched to Free plan.');
                  } catch (e) {
                    console.error('Switch to free failed:', e);
                    Alert.alert('Error', 'Failed to switch plan. Please try again.');
                  }
                }} 
                style={{ flex: 1 }} 
              />
            ) : (
              <Button title="Upgrade" onPress={() => navigation.navigate('Billing')} style={{ flex: 1 }} />
            )}
          </View>
        </Card>

        {/* Notifications + inline sleep schedule */}

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

          {profile.notifications_enabled && (
            <View>
              <CollapsibleTimePicker
                label="Bedtime"
                hour={profile.bedtime_hour}
                minute={profile.bedtime_minute}
                onHourChange={async (hour) => {
                  setProfile(prev => ({ ...prev, bedtime_hour: hour }));
                  try {
                    const updated = await updateProfile({ bedtime_hour: hour });
                    setProfile(prev => ({ ...prev, ...updated }));
                    await rescheduleAllReminders({
                      notifications_enabled: updated.notifications_enabled ?? profile.notifications_enabled,
                      bedtime_hour: updated.bedtime_hour ?? hour,
                      bedtime_minute: updated.bedtime_minute ?? profile.bedtime_minute,
                      wakeup_hour: updated.wakeup_hour ?? profile.wakeup_hour,
                      wakeup_minute: updated.wakeup_minute ?? profile.wakeup_minute,
                    });
                  } catch (e) {
                    console.log('Failed to save bedtime hour:', e.message);
                  }
                }}
                onMinuteChange={async (minute) => {
                  setProfile(prev => ({ ...prev, bedtime_minute: minute }));
                  try {
                    const updated = await updateProfile({ bedtime_minute: minute });
                    setProfile(prev => ({ ...prev, ...updated }));
                    await rescheduleAllReminders({
                      notifications_enabled: updated.notifications_enabled ?? profile.notifications_enabled,
                      bedtime_hour: updated.bedtime_hour ?? profile.bedtime_hour,
                      bedtime_minute: updated.bedtime_minute ?? minute,
                      wakeup_hour: updated.wakeup_hour ?? profile.wakeup_hour,
                      wakeup_minute: updated.wakeup_minute ?? profile.wakeup_minute,
                    });
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
                    const updated = await updateProfile({ wakeup_hour: hour });
                    setProfile(prev => ({ ...prev, ...updated }));
                    await rescheduleAllReminders({
                      notifications_enabled: updated.notifications_enabled ?? profile.notifications_enabled,
                      bedtime_hour: updated.bedtime_hour ?? profile.bedtime_hour,
                      bedtime_minute: updated.bedtime_minute ?? profile.bedtime_minute,
                      wakeup_hour: updated.wakeup_hour ?? hour,
                      wakeup_minute: updated.wakeup_minute ?? profile.wakeup_minute,
                    });
                  } catch (e) {
                    console.log('Failed to save wakeup hour:', e.message);
                  }
                }}
                onMinuteChange={async (minute) => {
                  setProfile(prev => ({ ...prev, wakeup_minute: minute }));
                  try {
                    const updated = await updateProfile({ wakeup_minute: minute });
                    setProfile(prev => ({ ...prev, ...updated }));
                    await rescheduleAllReminders({
                      notifications_enabled: updated.notifications_enabled ?? profile.notifications_enabled,
                      bedtime_hour: updated.bedtime_hour ?? profile.bedtime_hour,
                      bedtime_minute: updated.bedtime_minute ?? profile.bedtime_minute,
                      wakeup_hour: updated.wakeup_hour ?? profile.wakeup_hour,
                      wakeup_minute: updated.wakeup_minute ?? minute,
                    });
                  } catch (e) {
                    console.log('Failed to save wakeup minute:', e.message);
                  }
                }}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing(1) }}>
                Notifications will be sent at your wake-up time to remind you to log your dreams.
              </Text>
            </View>
          )}
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
            Security
          </Text>
          <Button title="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
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