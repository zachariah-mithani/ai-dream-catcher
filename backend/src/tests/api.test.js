/**
 * Basic API Testing Suite
 * Tests critical endpoints and functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const BASE_URL = 'http://localhost:4000';
let authToken = '';
let testUserId = '';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'testpassword123'
};

describe('AI Dream Catcher API Tests', () => {
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Health & System', () => {
    it('should return health status', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBeDefined();
    });

    it('should return system metrics', async () => {
      const response = await axios.get(`${BASE_URL}/metrics`);
      expect(response.status).toBe(200);
      expect(response.data.uptime).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
      expect(response.status).toBe(201);
      expect(response.data.token).toBeDefined();
      authToken = response.data.token;
    });

    it('should login with valid credentials', async () => {
      const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
      expect(response.status).toBe(200);
      expect(response.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      try {
        await axios.post(`${BASE_URL}/auth/login`, {
          email: testUser.email,
          password: 'wrongpassword'
        });
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Dream Management', () => {
    it('should create a dream', async () => {
      const response = await axios.post(`${BASE_URL}/dreams`, {
        content: 'Test dream content'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      testUserId = response.data.user_id;
    });

    it('should retrieve dreams', async () => {
      const response = await axios.get(`${BASE_URL}/dreams`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should enforce authentication', async () => {
      try {
        await axios.post(`${BASE_URL}/dreams`, {
          content: 'Unauthorized dream'
        });
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('AI Analysis', () => {
    it('should analyze dream content', async () => {
      const response = await axios.post(`${BASE_URL}/analysis`, {
        content: 'I had a dream about flying over mountains'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(response.data.analysis).toBeDefined();
    });

    it('should enforce usage limits', async () => {
      // Create multiple analyses to test limit enforcement
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          axios.post(`${BASE_URL}/analysis`, {
            content: `Test dream analysis ${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).catch(err => err.response)
        );
      }
      
      const responses = await Promise.all(promises);
      const errorResponses = responses.filter(r => r.status >= 400);
      expect(errorResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Chat Functionality', () => {
    it('should handle chat messages', async () => {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: 'What does flying in dreams mean?'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(response.data.response).toBeDefined();
    });
  });

  describe('Billing System', () => {
    it('should return pricing information', async () => {
      const response = await axios.get(`${BASE_URL}/billing/pricing`);
      expect(response.status).toBe(200);
      expect(response.data.monthly).toBeDefined();
      expect(response.data.yearly).toBeDefined();
    });

    it('should check billing status', async () => {
      const response = await axios.get(`${BASE_URL}/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(response.data.plan).toBeDefined();
    });

    it('should handle premium upgrade', async () => {
      const response = await axios.post(`${BASE_URL}/billing/upgrade`, {
        plan: 'premium',
        trial_days: 7
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(response.data.plan).toBe('premium');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      try {
        await axios.get(`${BASE_URL}/nonexistent-endpoint`);
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle validation errors', async () => {
      try {
        await axios.post(`${BASE_URL}/dreams`, {
          // Missing required content field
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});

// Cleanup after tests
afterAll(async () => {
  if (authToken && testUserId) {
    try {
      // Clean up test data if needed
      await axios.delete(`${BASE_URL}/auth/account`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});
