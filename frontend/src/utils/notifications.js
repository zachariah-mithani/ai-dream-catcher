import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys to store scheduled notification identifiers
const BEDTIME_KEY = 'notif_bedtime_id';
const WAKEUP_KEY = 'notif_wakeup_id';
// Throttle keys so we don't spam immediate test notifications
const LAST_IMMEDIATE_WAKE_KEY = 'notif_last_immediate_wake';

export async function ensureNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Ensure notifications display even when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

async function scheduleDaily(identifierKey, title, body, hour, minute) {
  // Cancel existing if present
  const existingId = await AsyncStorage.getItem(identifierKey);
  if (existingId) {
    try { await Notifications.cancelScheduledNotificationAsync(existingId); } catch {}
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { hour, minute, repeats: true },
  });
  await AsyncStorage.setItem(identifierKey, id);
  return id;
}

async function cancelByKey(identifierKey) {
  const existingId = await AsyncStorage.getItem(identifierKey);
  if (existingId) {
    try { await Notifications.cancelScheduledNotificationAsync(existingId); } catch {}
    await AsyncStorage.removeItem(identifierKey);
  }
}

export async function scheduleBedtimeReminder(hour, minute) {
  return scheduleDaily(
    BEDTIME_KEY,
    'Wind down for restful sleep',
    'A gentle reminder to prepare for bed and set intentions.',
    hour,
    minute
  );
}

export async function scheduleWakeupReminder(hour, minute) {
  return scheduleDaily(
    WAKEUP_KEY,
    'Log your dream',
    "Capture your dream details while they're fresh.",
    hour,
    minute
  );
}

export async function cancelAllReminders() {
  await Promise.all([cancelByKey(BEDTIME_KEY), cancelByKey(WAKEUP_KEY)]);
}

export async function rescheduleAllReminders({
  notifications_enabled,
  bedtime_hour,
  bedtime_minute,
  wakeup_hour,
  wakeup_minute,
}) {
  if (!notifications_enabled) {
    await cancelAllReminders();
    return { bedtimeId: null, wakeupId: null };
  }
  const granted = await ensureNotificationPermissions();
  if (!granted) {
    // If not granted, ensure no schedules remain
    await cancelAllReminders();
    return { bedtimeId: null, wakeupId: null };
  }
  const [bedtimeId, wakeupId] = await Promise.all([
    scheduleBedtimeReminder(bedtime_hour ?? 22, bedtime_minute ?? 0),
    scheduleWakeupReminder(wakeup_hour ?? 7, wakeup_minute ?? 0),
  ]);

  // Removed immediate one-off wake notification to avoid alerts firing
  // right after saving profile changes. Daily schedules above are sufficient.

  return { bedtimeId, wakeupId };
}


