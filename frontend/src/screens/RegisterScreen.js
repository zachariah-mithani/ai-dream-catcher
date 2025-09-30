import React, { useState } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { register } from '../api';
import { Screen, Card, Text, Input, Button, Subtle } from '../ui/components';
import { useTheme } from '../contexts/ThemeContext';
import DreamCatcherLogo from '../components/DreamCatcherLogo';

export default function RegisterScreen({ navigation }) {
  const { colors, spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);

  const onRegister = async () => {
    setBusy(true);
    try {
      const profile = {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        username: username.trim() || undefined,
        theme_preference: 'dark'
      };
      await register(email.trim(), password, profile);
      // Clear flags so new users see theme selection and onboarding
      await AsyncStorage.removeItem('onboarding_completed');
      await AsyncStorage.removeItem('theme_selected');
      // The App component will automatically re-render and show the authenticated stack
      // No need to navigate manually
    } catch (e) {
      Alert.alert('Registration failed', e.response?.data?.error || 'Try a different email and strong password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ justifyContent: 'center', padding: 24 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: spacing(4) }}>
          <DreamCatcherLogo size={100} />
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
            Start your dream journey today
          </Subtle>
        </View>
        
        <Card>
          <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12, textAlign: 'center' }}>Create account</Text>
          
          <Input 
            placeholder="Email" 
            autoCapitalize='none' 
            keyboardType='email-address' 
            value={email} 
            onChangeText={setEmail} 
            style={{ marginBottom: 12 }} 
          />
          
          <Input 
            placeholder="Password" 
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
            style={{ marginBottom: 12 }} 
          />
          
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Input 
              placeholder="First Name" 
              value={firstName} 
              onChangeText={setFirstName} 
              style={{ flex: 1 }} 
            />
            <Input 
              placeholder="Last Name" 
              value={lastName} 
              onChangeText={setLastName} 
              style={{ flex: 1 }} 
            />
          </View>
          
          <Input 
            placeholder="Username (optional)" 
            value={username} 
            onChangeText={setUsername} 
            autoCapitalize='none'
            style={{ marginBottom: 12 }} 
          />
          
          <Button 
            title={busy ? 'Creating...' : 'Create Account'} 
            onPress={onRegister}
            disabled={busy}
          />
          
          <View style={{ alignItems: 'center', marginTop: spacing(2) }}>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ 
                color: colors.primary, 
                fontSize: 16, 
                textAlign: 'center',
                textDecorationLine: 'underline'
              }}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}


