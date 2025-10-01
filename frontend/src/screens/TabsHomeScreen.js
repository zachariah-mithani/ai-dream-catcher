import React from 'react';
import { View } from 'react-native';
import { Screen, Text, Button } from '../ui/components';
import DreamCatcherLogo from '../components/DreamCatcherLogo';

export default function TabsHomeScreen({ navigation }) {
  return (
    <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <DreamCatcherLogo size={120} style={{ marginBottom: 48 }} />
      <Button title="Log Dream" onPress={() => navigation.getParent()?.navigate('Journal')} style={{ paddingHorizontal: 28, borderRadius: 999 }} />
    </Screen>
  );
}


