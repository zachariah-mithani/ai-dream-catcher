import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Screen, Card, Text, Input, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { resetPassword } from '../api';

export default function ResetPasswordScreen({ route, navigation }) {
  const presetToken = route?.params?.token || '';
  const { spacing } = useTheme();
  const [token, setToken] = useState(presetToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const onReset = async () => {
    if (!token.trim()) return Alert.alert('Missing token', 'Paste the reset token.');
    if (password.length < 6) return Alert.alert('Weak password', 'Use at least 6 characters.');
    if (password !== confirm) return Alert.alert('Mismatch', 'Passwords do not match.');
    setBusy(true);
    try {
      await resetPassword(token.trim(), password);
      Alert.alert('Success', 'Password has been reset. Please sign in.');
      navigation.navigate('Login');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ padding: spacing(2), justifyContent: 'center' }}>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: spacing(1) }}>Reset Password</Text>
        <Input placeholder="Token" value={token} onChangeText={setToken} style={{ marginBottom: spacing(1) }} />
        <Input placeholder="New Password" secureTextEntry value={password} onChangeText={setPassword} style={{ marginBottom: spacing(1) }} />
        <Input placeholder="Confirm Password" secureTextEntry value={confirm} onChangeText={setConfirm} style={{ marginBottom: spacing(2) }} />
        <Button title={busy ? 'Resetting...' : 'Reset Password'} onPress={onReset} disabled={busy} />
      </Card>
    </Screen>
  );
}


