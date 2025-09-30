import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Screen, Card, Text, Input, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import { requestPasswordReset } from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(null);

  const onRequest = async () => {
    setBusy(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setToken(res.token || null);
      Alert.alert('Check your email', 'If an account exists, a reset link was sent. For testing, a token may show below.');
    } catch (e) {
      Alert.alert('Error', 'Failed to request reset.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ padding: spacing(2), justifyContent: 'center' }}>
      <Card>
        <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: spacing(1) }}>Forgot Password</Text>
        <Subtle style={{ marginBottom: spacing(2) }}>Enter your account email to receive a reset link.</Subtle>
        <Input placeholder="Email" autoCapitalize='none' keyboardType='email-address' value={email} onChangeText={setEmail} style={{ marginBottom: spacing(2) }} placeholderTextColor="#ffffffAA" />
        <Button title={busy ? 'Sending...' : 'Send Reset Link'} onPress={onRequest} disabled={busy} />
        {token && (
          <View style={{ marginTop: spacing(2) }}>
            <Subtle>Testing token:</Subtle>
            <Text selectable style={{ color: colors.text, fontSize: 12 }}>{token}</Text>
            <Button title="I have a token" onPress={() => navigation.navigate('ResetPassword', { token })} style={{ marginTop: spacing(1) }} />
          </View>
        )}
      </Card>
    </Screen>
  );
}


