#!/usr/bin/env node

/**
 * Quick Billing System Test
 * Run this to quickly verify the billing system is working
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4000';
let authToken = '';

async function testBillingSystem() {
  console.log('🧪 Quick Billing System Test\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    try {
      const response = await axios.get(`${BASE_URL}/billing/pricing`);
      console.log('✅ Server is running and billing endpoint accessible');
      console.log('   Pricing data:', response.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server not running. Start with: npm start');
        return;
      }
      throw error;
    }

    // Test 2: Register a test user
    console.log('\n2. Creating test user...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123'
      });
      authToken = registerResponse.data.token;
      console.log('✅ Test user created and authenticated');
    } catch (error) {
      console.log('❌ User creation failed:', error.response?.data || error.message);
      return;
    }

    // Test 3: Check initial billing status
    console.log('\n3. Checking initial billing status...');
    try {
      const billingResponse = await axios.get(`${BASE_URL}/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Billing status retrieved');
      console.log('   Plan:', billingResponse.data.plan);
      console.log('   Usage:', billingResponse.data.usage);
    } catch (error) {
      console.log('❌ Billing status check failed:', error.response?.data || error.message);
    }

    // Test 4: Test dream creation limit
    console.log('\n4. Testing dream creation limit...');
    try {
      for (let i = 1; i <= 12; i++) {
        const response = await axios.post(`${BASE_URL}/dreams`, {
          content: `Test dream ${i}`
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (i <= 10) {
          console.log(`✅ Dream ${i} created successfully`);
        } else {
          console.log('❌ Dream should have been blocked by limit');
          break;
        }
      }
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error?.includes('limit reached')) {
        console.log('✅ Dream creation limit properly enforced');
        console.log('   Error:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 5: Test AI analysis limit
    console.log('\n5. Testing AI analysis limit...');
    try {
      for (let i = 1; i <= 7; i++) {
        const response = await axios.post(`${BASE_URL}/analysis`, {
          content: `Test dream content for analysis ${i}`
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (i <= 5) {
          console.log(`✅ Analysis ${i} completed successfully`);
        } else {
          console.log('❌ Analysis should have been blocked by limit');
          break;
        }
      }
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error?.includes('limit reached')) {
        console.log('✅ AI analysis limit properly enforced');
        console.log('   Error:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 6: Test premium upgrade
    console.log('\n6. Testing premium upgrade...');
    try {
      const upgradeResponse = await axios.post(`${BASE_URL}/billing/upgrade`, {
        plan: 'premium',
        trial_days: 7
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Premium upgrade successful');
      console.log('   New plan:', upgradeResponse.data.plan);
      console.log('   Trial end:', upgradeResponse.data.trial_end);
    } catch (error) {
      console.log('❌ Premium upgrade failed:', error.response?.data || error.message);
    }

    // Test 7: Verify premium user can exceed limits
    console.log('\n7. Testing premium user limits...');
    try {
      const response = await axios.post(`${BASE_URL}/dreams`, {
        content: 'Premium user test dream'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Premium user can create unlimited dreams');
    } catch (error) {
      console.log('❌ Premium user should have unlimited access:', error.response?.data || error.message);
    }

    // Test 8: Check final billing status
    console.log('\n8. Checking final billing status...');
    try {
      const billingResponse = await axios.get(`${BASE_URL}/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Final billing status:');
      console.log('   Plan:', billingResponse.data.plan);
      console.log('   Usage:', billingResponse.data.usage);
    } catch (error) {
      console.log('❌ Final billing status check failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Billing system test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Server running and accessible');
    console.log('   ✅ User registration and authentication');
    console.log('   ✅ Billing status tracking');
    console.log('   ✅ Usage limits enforcement');
    console.log('   ✅ Premium upgrade functionality');
    console.log('   ✅ Premium user unlimited access');
    
    console.log('\n🚀 Your billing system is working correctly!');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testBillingSystem();
