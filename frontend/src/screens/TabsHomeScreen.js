import React from 'react';
import { View } from 'react-native';
import { Screen, Text, Button } from '../ui/components';
import DreamCatcherLogo from '../components/DreamCatcherLogo';

export default function TabsHomeScreen({ navigation }) {
  return (
    <Screen style={{ justifyContent: 'flex-start', alignItems: 'center', padding: 24, paddingTop: 120 }}>
      <DreamCatcherLogo size={120} style={{ marginBottom: 32 }} />
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 16 }}>Welcome</Text>
      <Button title="Log Dream" onPress={() => navigation.getParent()?.navigate('Journal')} style={{ paddingHorizontal: 28, borderRadius: 999 }} />
    </Screen>
  );
}


