import React from 'react';
import { View } from 'react-native';
import { Screen, Text, Button } from '../ui/components';

export default function TabsHomeScreen({ navigation }) {
  return (
    <Screen style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 16 }}>Welcome</Text>
      <Button title="Log Dream" onPress={() => navigation.getParent()?.navigate('Journal')} style={{ paddingHorizontal: 28, borderRadius: 999 }} />
    </Screen>
  );
}


