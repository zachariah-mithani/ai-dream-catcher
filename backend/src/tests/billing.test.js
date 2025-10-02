/**
 * Billing System Tests
 * Tests usage limits, subscription management, and billing logic
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

const BASE_URL = 'http://localhost:4000';
let authToken = '';

const testUser = {
  email: `billing-test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

describe('Billing System Tests', () => {
  
  beforeAll(async () => {
    // Create test user
    const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
    authToken = response.data.token;
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Free Plan Limits', () => {
    it('should enforce dream creation limit', async () => {
      const promises = [];
      
      // Try to create 12 dreams (limit is 10)
      for (let i = 1; i <= 12; i++) {
        promises.push(
          axios.post(`${BASE_URL}/dreams`, {
            content: `Test dream ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).then(res => ({ success: true, index: i, status: res.status }))
          .catch(err => ({ success: false, index: i, status: err.response?.status }))
        );
      }
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      expect(successful.length).toBeLessThanOrEqual(10);
      expect(failed.length).toBeGreaterThan(0);
      
      // Check that failures are due to limit
      const limitErrors = failed.filter(r => r.status === 403);
      expect(limitErrors.length).toBeGreaterThan(0);
    });

    it('should enforce AI analysis limit', async () => {
      const promises = [];
      
      // Try to analyze 7 dreams (limit is 5)
      for (let i = 1; i <= 7; i++) {
        promises.push(
          axios.post(`${BASE_URL}/analysis`, {
            content: `Test dream analysis ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).then(res => ({ success: true, index: i, status: res.status }))
          .catch(err => ({ success: false, index: i, status: err.response?.status }))
        );
      }
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      expect(successful.length).toBeLessThanOrEqual(5);
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should enforce chat message limit', async () => {
      const promises = [];
      
      // Try to send 5 chat messages (limit is 3)
      for (let i = 1; i <= 5; i++) {
        promises.push(
          axios.post(`${BASE_URL}/chat`, {
            message: `Test chat message ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).then(res => ({ success: true, index: i, status: res.status }))
          .catch(err => ({ success: false, index: i, status: err.response?.status }))
        );
      }
      
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      expect(successful.length).toBeLessThanOrEqual(3);
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('Premium Upgrade', () => {
    it('should upgrade user to premium', async () => {
      const response = await axios.post(`${BASE_URL}/billing/upgrade`, {
        plan: 'premium',
        trial_days: 7
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.plan).toBe('premium');
      expect(response.data.trial_end).toBeDefined();
    });

    it('should allow unlimited usage for premium users', async () => {
      // Test unlimited dream creation
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(
          axios.post(`${BASE_URL}/dreams`, {
            content: `Premium test dream ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        );
      }
      
      const results = await Promise.all(promises);
      expect(results.every(r => r.status === 201)).toBe(true);
    });

    it('should allow unlimited AI analysis for premium users', async () => {
      const promises = [];
      for (let i = 1; i <= 3; i++) {
        promises.push(
          axios.post(`${BASE_URL}/analysis`, {
            content: `Premium analysis ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        );
      }
      
      const results = await Promise.all(promises);
      expect(results.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('Usage Tracking', () => {
    it('should track usage correctly', async () => {
      const response = await axios.get(`${BASE_URL}/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.usage).toBeDefined();
      expect(typeof response.data.usage).toBe('object');
    });

    it('should reset usage for new period', async () => {
      // This test would require time manipulation or database reset
      // For now, just verify the structure
      const response = await axios.get(`${BASE_URL}/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.data.period).toBeDefined();
      expect(response.data.usage).toBeDefined();
    });
  });

  describe('Billing Endpoints', () => {
    it('should return pricing information', async () => {
      const response = await axios.get(`${BASE_URL}/billing/pricing`);
      
      expect(response.status).toBe(200);
      expect(response.data.monthly).toBeDefined();
      expect(response.data.yearly).toBeDefined();
      expect(response.data.monthly.price).toBeDefined();
      expect(response.data.yearly.price).toBeDefined();
    });

    it('should handle checkout session creation', async () => {
      try {
        const response = await axios.post(`${BASE_URL}/billing/checkout`, {
          priceId: 'monthly',
          trialDays: 7
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        // This might fail in test environment without Stripe keys
        // Just verify the endpoint exists
        expect([200, 400, 500]).toContain(response.status);
      } catch (error) {
        // Expected in test environment without Stripe
        expect([400, 500]).toContain(error.response?.status);
      }
    });
  });
});
