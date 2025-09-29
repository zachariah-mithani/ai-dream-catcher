import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Screen, Card, Text, Input, Button } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { changePassword } from '../api';

export default function ChangePasswordScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Your password has been updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: spacing(2) }}>Change Password</Text>
        <Input 
          placeholder="Current password" 
          secureTextEntry 
          value={currentPassword} 
          onChangeText={setCurrentPassword}
          style={{ marginBottom: spacing(2) }}
        />
        <Input 
          placeholder="New password" 
          secureTextEntry 
          value={newPassword} 
          onChangeText={setNewPassword}
          style={{ marginBottom: spacing(2) }}
        />
        <Input 
          placeholder="Confirm new password" 
          secureTextEntry 
          value={confirmPassword} 
          onChangeText={setConfirmPassword}
          style={{ marginBottom: spacing(2) }}
        />
        <Button title={saving ? 'Saving...' : 'Update Password'} onPress={onSubmit} disabled={saving} />
      </Card>
    </Screen>
  );
}


