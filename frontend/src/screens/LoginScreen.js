import React, { useState } from 'react';
import { View, Alert, TouchableOpacity } from 'react-native';
import { login } from '../api';
import { Screen, Card, Text, Input, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import CloudLogo from '../components/CloudLogo';

export default function LoginScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    setBusy(true);
    try {
      await login(email.trim(), password);
      // The App component will automatically re-render and show the authenticated stack
      // No need to navigate manually
    } catch (e) {
      Alert.alert('Login failed', 'Check your email or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ justifyContent: 'center', padding: 24 }}>
      <View style={{ alignItems: 'center', marginBottom: spacing(4) }}>
        <CloudLogo size={100} />
        <Text style={{ 
          fontSize: 28, 
          fontWeight: '800', 
          marginTop: spacing(2),
          color: colors.text,
          textAlign: 'center'
        }}>
          AI Dream Catcher
        </Text>
        <Subtle style={{ 
          fontSize: 16, 
          marginTop: spacing(1),
          textAlign: 'center'
        }}>
          Discover the meaning of your dreams
        </Subtle>
      </View>
      
      <Card>
        <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>Welcome back</Text>
        <Input placeholder="Email" autoCapitalize='none' keyboardType='email-address' value={email} onChangeText={setEmail} style={{ marginBottom: 12 }} />
        <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={{ marginBottom: 12 }} />
        <Button title={busy ? 'Signing in...' : 'Sign In'} onPress={onLogin} />
        <View style={{ alignItems: 'center', marginTop: spacing(2) }}>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ 
              color: colors.primary, 
              fontSize: 16, 
              textAlign: 'center',
              textDecorationLine: 'underline'
            }}>
              Don't have an account? Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Screen>
  );
}


