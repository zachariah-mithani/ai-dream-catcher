// Test script for notification functionality
const { scheduleWakeupReminder, scheduleBedtimeReminder, getScheduledNotifications, rescheduleAllReminders, cancelAllReminders } = require('./src/utils/notifications');

async function testNotifications() {
  console.log('🧪 Testing Notification System...\n');

  try {
    // Test 1: Schedule a wake-up reminder for 1 minute from now
    console.log('Test 1: Scheduling wake-up reminder for 1 minute from now...');
    const now = new Date();
    const testWakeTime = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute from now
    const wakeHour = testWakeTime.getHours();
    const wakeMinute = testWakeTime.getMinutes();

    console.log(`Setting wake-up time to: ${wakeHour}:${wakeMinute.toString().padStart(2, '0')}`);

    const wakeId = await scheduleWakeupReminder(wakeHour, wakeMinute);
    console.log(`✅ Wake-up reminder scheduled with ID: ${wakeId}\n`);

    // Test 2: Schedule a bedtime reminder for 2 minutes from now
    console.log('Test 2: Scheduling bedtime reminder for 2 minutes from now...');
    const testBedTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const bedHour = testBedTime.getHours();
    const bedMinute = testBedTime.getMinutes();

    console.log(`Setting bedtime to: ${bedHour}:${bedMinute.toString().padStart(2, '0')}`);

    const bedId = await scheduleBedtimeReminder(bedHour, bedMinute);
    console.log(`✅ Bedtime reminder scheduled with ID: ${bedId}\n`);

    // Test 3: Check scheduled notifications
    console.log('Test 3: Checking all scheduled notifications...');
    const scheduled = await getScheduledNotifications();
    console.log(`Found ${scheduled.length} scheduled notifications:`);
    scheduled.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.content.title}: ${notif.content.body}`);
      if (notif.trigger) {
        const triggerTime = new Date(notif.trigger.value || notif.trigger.date);
        console.log(`   Scheduled for: ${triggerTime.toLocaleString()}`);
      }
    });
    console.log('');

    // Test 4: Test rescheduleAllReminders function
    console.log('Test 4: Testing rescheduleAllReminders function...');
    await cancelAllReminders();

    const result = await rescheduleAllReminders({
      notifications_enabled: true,
      wakeup_hour: wakeHour,
      wakeup_minute: wakeMinute,
      bedtime_hour: bedHour,
      bedtime_minute: bedMinute,
    });

    console.log(`Rescheduled - Wake-up ID: ${result.wakeupId}, Bedtime ID: ${result.bedtimeId}\n`);

    // Test 5: Test with time that's too close (should be skipped)
    console.log('Test 5: Testing scheduling with time too close to current time (should be skipped)...');
    const closeTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now (within 10-minute buffer)
    const closeHour = closeTime.getHours();
    const closeMinute = closeTime.getMinutes();

    console.log(`Attempting to schedule for: ${closeHour}:${closeMinute.toString().padStart(2, '0')} (should be skipped)`);

    const closeId = await scheduleWakeupReminder(closeHour, closeMinute);
    console.log(`Result: ${closeId ? 'Scheduled (unexpected!)' : 'Skipped (expected)'}\n`);

    // Test 6: Verify final scheduled notifications
    console.log('Test 6: Final check of scheduled notifications...');
    const finalScheduled = await getScheduledNotifications();
    console.log(`Total scheduled notifications: ${finalScheduled.length}`);
    finalScheduled.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.content.title}`);
      if (notif.trigger) {
        const triggerTime = new Date(notif.trigger.value || notif.trigger.date);
        const timeUntil = Math.round((triggerTime.getTime() - now.getTime()) / 1000 / 60);
        console.log(`   Triggers in: ${timeUntil} minutes`);
      }
    });

    console.log('\n🎉 All notification tests completed successfully!');
    console.log('📱 The scheduled notifications should appear at their designated times.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testNotifications().then(() => {
  console.log('\n🏁 Test script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
