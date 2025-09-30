import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ThemeSelectionScreen from './screens/ThemeSelectionScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import JournalScreen from './screens/JournalScreen';
import EnhancedJournalScreen from './screens/EnhancedJournalScreen';
import DreamDetailScreen from './screens/DreamDetailScreen';
import ChatScreen from './screens/ChatScreen';
import DreamLogScreen from './screens/AnalysisScreen';
import MoodTrackingScreen from './screens/MoodTrackingScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import EditDreamScreen from './screens/EditDreamScreen';
import TermsScreen from './screens/legal/TermsScreen';
import PrivacyScreen from './screens/legal/PrivacyScreen';
import AboutScreen from './screens/legal/AboutScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import TabsHomeScreen from './screens/TabsHomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { api } from './api';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        height: 80 + insets.bottom
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: { fontSize: 12, marginTop: 4 },
      tabBarIcon: ({ color, size }) => {
        const map = { 
          Dreams: 'book-outline',
          Mood: 'happy-outline',
          Home: 'home-outline', 
          Chat: 'chatbubble-outline',
          Profile: 'person-outline' 
        };
        return <Ionicons name={map[route.name]} size={24} color={color} />;
      }
    })}>
      <Tab.Screen name="Dreams" component={DreamLogScreen} options={{ title: 'Dream Log' }} />
      <Tab.Screen name="Mood" component={MoodTrackingScreen} options={{ title: 'Mood' }} />
      <Tab.Screen name="Home" component={TabsHomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const [authed, setAuthed] = useState(null);
  const [showThemeSelection, setShowThemeSelection] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { theme, colors } = useTheme();
  
  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      setAuthed(false);
      setShowThemeSelection(false);
      setShowOnboarding(false);
      return;
    }
    
    try {
      // Validate token by calling profile endpoint
      const response = await api.get('/auth/profile');
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      const themeSelected = await AsyncStorage.getItem('theme_selected');
      
      setAuthed(true);
      
      if (!themeSelected) {
        // New user - show theme selection first
        setShowThemeSelection(true);
        setShowOnboarding(false);
      } else if (!onboardingCompleted) {
        // Theme selected but no onboarding - show onboarding
        setShowThemeSelection(false);
        setShowOnboarding(true);
      } else {
        // Everything completed - show main app
        setShowThemeSelection(false);
        setShowOnboarding(false);
      }
    } catch (error) {
      console.log('Auth validation error:', error);
      // Token is invalid or network error, clear it
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setAuthed(false);
      setShowThemeSelection(false);
      setShowOnboarding(false);
    }
  };

  const handleThemeSelectionComplete = async () => {
    await AsyncStorage.setItem('theme_selected', 'true');
    setShowThemeSelection(false);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };
  
  useEffect(() => {
    checkAuth();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    const handleAppStateChange = () => {
      checkAuth();
    };
    
    // Only check auth state when app comes to foreground, not continuously
    // Remove the frequent interval that was causing theme resets
  }, []);

  if (authed === null) return null;
  
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={theme === 'minimalistBlack' ? 'light' : 'dark'} />
        <Stack.Navigator screenOptions={{ 
          headerStyle: { backgroundColor: colors.surface }, 
          headerTintColor: colors.text, 
          contentStyle: { backgroundColor: colors.background } 
        }}>
          {!authed ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'AI Dream Catcher' }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
            </>
          ) : showThemeSelection ? (
            <Stack.Screen 
              name="ThemeSelection" 
              options={{ headerShown: false }}
            >
              {() => <ThemeSelectionScreen onComplete={handleThemeSelectionComplete} />}
            </Stack.Screen>
          ) : showOnboarding ? (
            <Stack.Screen 
              name="Onboarding" 
              options={{ headerShown: false }}
            >
              {() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
              <Stack.Screen name="Journal" component={EnhancedJournalScreen} options={{ title: 'Your Journal' }} />
              <Stack.Screen name="DreamDetail" component={DreamDetailScreen} options={{ title: 'Dream' }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Ask the Analyst' }} />
              <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
                  <Stack.Screen name="EditDream" component={EditDreamScreen} options={{ title: 'Edit Dream' }} />
                  <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms of Service' }} />
                  <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
                  <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}


