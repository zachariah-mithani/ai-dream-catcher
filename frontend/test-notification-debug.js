// Simple notification test script for debugging
import { sendTestNotification, getScheduledNotifications } from './src/utils/notifications.js';

async function testNotifications() {
  console.log('🧪 Testing notifications...');
  
  try {
    // Send immediate test notification
    console.log('📱 Sending test notification...');
    await sendTestNotification();
    
    // Check scheduled notifications
    console.log('📋 Checking scheduled notifications...');
    const scheduled = await getScheduledNotifications();
    console.log(`Found ${scheduled.length} scheduled notifications:`);
    
    scheduled.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.content.title}`);
      console.log(`   Body: ${notif.content.body}`);
      console.log(`   Trigger: ${JSON.stringify(notif.trigger)}`);
    });
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotifications();
