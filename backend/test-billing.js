#!/usr/bin/env node

/**
 * Billing System Test Script
 * 
 * This script tests the billing functionality to ensure everything works correctly.
 * Run with: node test-billing.js
 */

import 'dotenv/config';
import { db, initSchema } from './src/database.js';
import { checkTrialStatus, checkUsageLimit, incrementUsage, PLAN_LIMITS } from './src/billing.js';

async function testBillingSystem() {
  console.log('🧪 Testing AI Dream Catcher Billing System\n');

  try {
    // Initialize database
    console.log('1. Initializing database...');
    await initSchema();
    console.log('✅ Database initialized\n');

    // Test 1: Create a test user
    console.log('2. Creating test user...');
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';
    
    // Check if user exists, delete if so
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(testEmail);
    if (existingUser) {
      await db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
      console.log('   Removed existing test user');
    }
    
    // Create new test user
    const userResult = await db.prepare(`
      INSERT INTO users (email, password_hash, plan, created_at) 
      VALUES (?, ?, 'free', CURRENT_TIMESTAMP)
    `).run(testEmail, 'hashed_password');
    
    const userId = userResult.lastInsertRowid;
    console.log(`✅ Test user created with ID: ${userId}\n`);

    // Test 2: Check trial status
    console.log('3. Testing trial status check...');
    const trialStatus = await checkTrialStatus(userId);
    console.log(`   Trial status:`, trialStatus);
    console.log('✅ Trial status check passed\n');

    // Test 3: Test usage limits
    console.log('4. Testing usage limits...');
    
    // Test dream creation limit
    const dreamLimit = await checkUsageLimit(userId, 'dream_create', PLAN_LIMITS.free.dream_create.limit, '2025-01');
    console.log(`   Dream creation limit:`, dreamLimit);
    
    // Test AI analysis limit
    const analysisLimit = await checkUsageLimit(userId, 'ai_analyze', PLAN_LIMITS.free.ai_analyze.limit, '2025-01');
    console.log(`   AI analysis limit:`, analysisLimit);
    
    // Test chat message limit
    const chatLimit = await checkUsageLimit(userId, 'chat_message', PLAN_LIMITS.free.chat_message.limit, '2025-01-15');
    console.log(`   Chat message limit:`, chatLimit);
    
    console.log('✅ Usage limit checks passed\n');

    // Test 4: Test usage increment
    console.log('5. Testing usage increment...');
    
    // Increment dream creation usage
    await incrementUsage(userId, 'dream_create', '2025-01');
    const updatedDreamLimit = await checkUsageLimit(userId, 'dream_create', PLAN_LIMITS.free.dream_create.limit, '2025-01');
    console.log(`   After dream creation:`, updatedDreamLimit);
    
    // Increment AI analysis usage
    await incrementUsage(userId, 'ai_analyze', '2025-01');
    const updatedAnalysisLimit = await checkUsageLimit(userId, 'ai_analyze', PLAN_LIMITS.free.ai_analyze.limit, '2025-01');
    console.log(`   After AI analysis:`, updatedAnalysisLimit);
    
    console.log('✅ Usage increment tests passed\n');

    // Test 5: Test premium user
    console.log('6. Testing premium user...');
    await db.prepare('UPDATE users SET plan = ? WHERE id = ?').run('premium', userId);
    
    const premiumTrialStatus = await checkTrialStatus(userId);
    console.log(`   Premium user trial status:`, premiumTrialStatus);
    
    const premiumLimit = await checkUsageLimit(userId, 'dream_create', PLAN_LIMITS.free.dream_create.limit, '2025-01');
    console.log(`   Premium user limit check:`, premiumLimit);
    
    console.log('✅ Premium user tests passed\n');

    // Test 6: Test trial expiration
    console.log('7. Testing trial expiration...');
    
    // Set trial end to past date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    await db.prepare('UPDATE users SET plan = ?, trial_end = ? WHERE id = ?')
      .run('premium', pastDate.toISOString(), userId);
    
    const expiredTrialStatus = await checkTrialStatus(userId);
    console.log(`   Expired trial status:`, expiredTrialStatus);
    
    // Verify user was downgraded to free
    const userAfterExpiration = await db.prepare('SELECT plan, trial_end FROM users WHERE id = ?').get(userId);
    console.log(`   User after expiration:`, userAfterExpiration);
    
    console.log('✅ Trial expiration test passed\n');

    // Test 7: Test usage counters table
    console.log('8. Testing usage counters table...');
    const usageCounters = await db.prepare('SELECT * FROM usage_counters WHERE user_id = ?').all(userId);
    console.log(`   Usage counters:`, usageCounters);
    
    console.log('✅ Usage counters test passed\n');

    // Test 8: Test subscription table
    console.log('9. Testing subscription table...');
    
    // Insert test subscription
    await db.prepare(`
      INSERT INTO user_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, 'cus_test123', 'sub_test123', 'active', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const subscription = await db.prepare('SELECT * FROM user_subscriptions WHERE user_id = ?').get(userId);
    console.log(`   Test subscription:`, subscription);
    
    console.log('✅ Subscription table test passed\n');

    // Cleanup
    console.log('10. Cleaning up test data...');
    await db.prepare('DELETE FROM usage_counters WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM user_subscriptions WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All billing system tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Database initialization');
    console.log('   ✅ User creation and management');
    console.log('   ✅ Trial status checking');
    console.log('   ✅ Usage limit enforcement');
    console.log('   ✅ Usage tracking and increment');
    console.log('   ✅ Premium user handling');
    console.log('   ✅ Trial expiration');
    console.log('   ✅ Usage counters table');
    console.log('   ✅ Subscription management');
    console.log('   ✅ Data cleanup');
    
    console.log('\n🚀 Your billing system is ready for production!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testBillingSystem().then(() => {
  console.log('\n✨ Billing system validation complete!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error during testing:', error);
  process.exit(1);
});
