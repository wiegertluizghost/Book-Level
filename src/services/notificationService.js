import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_ENABLED_KEY = 'notifications_enabled';
const NOTIF_ID_KEY = 'daily_notif_id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour = 20, minute = 0) {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  await cancelDailyReminder();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📚 Não perca seu streak hoje!',
      body: 'Registre pelo menos algumas páginas agora e mantenha seus dias consecutivos. Todo dia conta!',
    },
    trigger: { hour, minute, repeats: true },
  });
  await AsyncStorage.setItem(NOTIF_ID_KEY, id);
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'true');
  return true;
}

export async function cancelDailyReminder() {
  try {
    const id = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (id) await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY, 'false');
}

export async function getNotificationsEnabled() {
  const val = await AsyncStorage.getItem(NOTIF_ENABLED_KEY);
  return val === 'true';
}
