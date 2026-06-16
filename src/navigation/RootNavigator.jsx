import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { COLORS } from '../constants/colors';
import { requestNotificationPermission, scheduleDailyReminder } from '../services/notificationService';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    async function setupNotifications() {
      try {
        const done = await AsyncStorage.getItem('notif_setup_done');
        if (done === 'true') return;
        const granted = await requestNotificationPermission();
        if (granted) await scheduleDailyReminder(20, 0);
        await AsyncStorage.setItem('notif_setup_done', 'true');
      } catch {}
    }
    setupNotifications();
  }, [user?.uid]);

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}