import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

// Keys to store scheduled notification identifiers
const BEDTIME_KEY = 'notif_bedtime_id';
const WAKEUP_KEY = 'notif_wakeup_id';
// Throttle keys so we don't spam immediate test notifications
const LAST_IMMEDIATE_WAKE_KEY = 'notif_last_immediate_wake';

export async function ensureNotificationPermissions() {
  // Configure Android notification channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dream-catcher-reminders', {
      name: 'Dream Catcher Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted || request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Set notification handler - show notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

async function scheduleDaily(identifierKey, title, body, hour, minute) {
  console.log(`🔔 Scheduling ${identifierKey} notification for ${hour}:${minute.toString().padStart(2, '0')}`);
  console.log(`🔔 Notification details: "${title}" - "${body}"`);
  
  // Validate inputs
  if (typeof hour !== 'number' || typeof minute !== 'number') {
    console.error(`❌ Invalid time values: hour=${hour}, minute=${minute}`);
    throw new Error(`Invalid time values: hour=${hour}, minute=${minute}`);
  }
  
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    console.error(`❌ Time out of range: ${hour}:${minute}`);
    throw new Error(`Time out of range: ${hour}:${minute}`);
  }
  
  // Cancel existing if present
  const existingId = await AsyncStorage.getItem(identifierKey);
  if (existingId) {
    console.log(`🗑️ Canceling existing ${identifierKey} notification: ${existingId}`);
    try { 
      await Notifications.cancelScheduledNotificationAsync(existingId);
      console.log(`🗑️ Successfully canceled existing notification`);
    } catch (e) {
      console.log(`⚠️ Error canceling existing notification:`, e.message);
    }
  }

  // Schedule the notification using repeating calendar trigger
  const notificationConfig = {
    content: { 
      title, 
      body, 
      data: { type: identifierKey.includes('wakeup') ? 'wakeup' : 'bedtime' },
      ...(Platform.OS === 'android' && { channelId: 'dream-catcher-reminders' })
    },
    trigger: { 
      type: 'calendar',
      hour,
      minute,
      repeats: true
    },
  };
  
  console.log(`📅 Notification config:`, JSON.stringify(notificationConfig, null, 2));
  
  try {
    const id = await Notifications.scheduleNotificationAsync(notificationConfig);
    await AsyncStorage.setItem(identifierKey, id);
    console.log(`✅ Scheduled ${identifierKey} notification with ID: ${id}`);
    console.log(`✅ Notification will trigger daily at ${hour}:${minute.toString().padStart(2, '0')}`);
    return id;
  } catch (error) {
    console.error(`❌ Failed to schedule ${identifierKey} notification:`, error);
    throw error;
  }
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
  console.log('🔄 Rescheduling all reminders with config:', {
    notifications_enabled,
    bedtime_hour,
    bedtime_minute,
    wakeup_hour,
    wakeup_minute,
  });

  if (!notifications_enabled) {
    console.log('📵 Notifications disabled, canceling all reminders');
    await cancelAllReminders();
    return { bedtimeId: null, wakeupId: null };
  }
  
  const granted = await ensureNotificationPermissions();
  if (!granted) {
    console.log('❌ Notification permissions not granted, canceling all reminders');
    // If not granted, ensure no schedules remain
    await cancelAllReminders();
    return { bedtimeId: null, wakeupId: null };
  }
  
  console.log('✅ Notification permissions granted, proceeding with scheduling');
  
  // Hard reset all previously scheduled notifications to prevent duplicates
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🧹 Canceled all existing scheduled notifications');
  } catch (e) {
    console.log('⚠️ Error canceling existing notifications:', e.message);
  }
  
  // Only schedule the reminders the user explicitly set; otherwise cancel them
  let bedtimeId = null;
  let wakeupId = null;

  if (typeof bedtime_hour === 'number' && typeof bedtime_minute === 'number') {
    console.log(`🌙 Scheduling bedtime reminder for ${bedtime_hour}:${bedtime_minute.toString().padStart(2, '0')}`);
    bedtimeId = await scheduleBedtimeReminder(bedtime_hour, bedtime_minute);
  } else {
    console.log('🌙 No bedtime time set, canceling bedtime reminder');
    await cancelByKey(BEDTIME_KEY);
  }

  if (typeof wakeup_hour === 'number' && typeof wakeup_minute === 'number') {
    console.log(`☀️ Scheduling wake-up reminder for ${wakeup_hour}:${wakeup_minute.toString().padStart(2, '0')}`);
    wakeupId = await scheduleWakeupReminder(wakeup_hour, wakeup_minute);
  } else {
    console.log('☀️ No wake-up time set, canceling wake-up reminder');
    await cancelByKey(WAKEUP_KEY);
  }

  console.log('🎯 Rescheduling complete:', { bedtimeId, wakeupId });
  return { bedtimeId, wakeupId };
}

// Debug function to check scheduled notifications
export async function getScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Found', scheduled.length, 'scheduled notifications:');
    
    scheduled.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.content.title}`);
      console.log(`   Body: ${notif.content.body}`);
      console.log(`   Data: ${JSON.stringify(notif.content.data)}`);
      if (notif.trigger && notif.trigger.type === 'calendar') {
        console.log(`   Trigger: Daily at ${notif.trigger.hour}:${notif.trigger.minute.toString().padStart(2, '0')}`);
      } else {
        console.log(`   Trigger: ${JSON.stringify(notif.trigger)}`);
      }
    });
    
    return scheduled;
  } catch (e) {
    console.log('Failed to get scheduled notifications:', e.message);
    return [];
  }
}

// Debug function to verify current bedtime and wakeup settings
export async function debugNotificationSettings() {
  try {
    console.log('🔍 Debugging notification settings...');
    
    // Check AsyncStorage for notification IDs
    const bedtimeId = await AsyncStorage.getItem(BEDTIME_KEY);
    const wakeupId = await AsyncStorage.getItem(WAKEUP_KEY);
    
    console.log('📱 Stored notification IDs:');
    console.log(`   Bedtime ID: ${bedtimeId || 'None'}`);
    console.log(`   Wakeup ID: ${wakeupId || 'None'}`);
    
    // Get all scheduled notifications
    const scheduled = await getScheduledNotifications();
    
    // Check if our notifications are actually scheduled
    const bedtimeScheduled = scheduled.find(n => n.content.data?.type === 'bedtime');
    const wakeupScheduled = scheduled.find(n => n.content.data?.type === 'wakeup');
    
    console.log('✅ Notification Status:');
    console.log(`   Bedtime notification: ${bedtimeScheduled ? '✅ Scheduled' : '❌ Not scheduled'}`);
    console.log(`   Wakeup notification: ${wakeupScheduled ? '✅ Scheduled' : '❌ Not scheduled'}`);
    
    if (bedtimeScheduled) {
      console.log(`   Bedtime time: ${bedtimeScheduled.trigger.hour}:${bedtimeScheduled.trigger.minute.toString().padStart(2, '0')}`);
    }
    if (wakeupScheduled) {
      console.log(`   Wakeup time: ${wakeupScheduled.trigger.hour}:${wakeupScheduled.trigger.minute.toString().padStart(2, '0')}`);
    }
    
    return { bedtimeScheduled, wakeupScheduled, scheduled };
  } catch (e) {
    console.error('Failed to debug notification settings:', e.message);
    return { bedtimeScheduled: null, wakeupScheduled: null, scheduled: [] };
  }
}

// Test function to send immediate notification (for debugging)
export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification',
      },
      trigger: null, // null trigger means send immediately
    });
    console.log('Test notification sent');
  } catch (e) {
    console.log('Failed to send test notification:', e.message);
  }
}


