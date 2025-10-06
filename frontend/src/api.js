import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAuthChanged } from './utils/events';

const API_URL = Constants?.expoConfig?.extra?.API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_URL, timeout: 25000 }); // Reduced to 25s to match backend timeout

// Token refresh mutex to prevent race conditions
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Helper function to check if JWT token is expired
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp < now;
  } catch (e) {
    return true; // If we can't parse, consider it expired
  }
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    // Check if token is expired before making the request
    if (isTokenExpired(token)) {
      // Throttle noisy log: print at most once every 30s
      const now = Date.now();
      if (!api.__lastExpiredLogAt || now - api.__lastExpiredLogAt > 30000) {
        console.log('🔄 Token expired, will trigger refresh on 401');
        api.__lastExpiredLogAt = now;
      }
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 errors and auto-refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = await AsyncStorage.getItem('refresh');
      if (refreshToken) {
        try {
          console.log('🔄 Attempting token refresh...');
          const response = await api.post('/auth/refresh', { refresh: refreshToken });
          
          if (response.data?.access && response.data?.refresh) {
            console.log('✅ Token refreshed successfully');
            await AsyncStorage.setItem('token', response.data.access);
            await AsyncStorage.setItem('refresh', response.data.refresh);
            
            // Process queued requests
            processQueue(null, response.data.access);
            
            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.log('❌ Token refresh failed:', refreshError.message);
          
          // Check if it's a 400 error (likely expired refresh token)
          if (refreshError.response?.status === 400) {
            console.log('🔄 Refresh token expired or invalid, user needs to login again');
          }
          
          // Refresh failed, clear tokens and emit auth change
          processQueue(refreshError, null);
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('refresh');
          await AsyncStorage.removeItem('user');
          emitAuthChanged();
        } finally {
          isRefreshing = false;
        }
      } else {
        console.log('❌ No refresh token available - user needs to login');
        // No refresh token, clear everything
        processQueue(new Error('No refresh token'), null);
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        emitAuthChanged();
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  await AsyncStorage.setItem('token', data.token);
  if (data.refresh) await AsyncStorage.setItem('refresh', data.refresh);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  emitAuthChanged();
  return data.user;
}

export async function register(email, password, profile = {}) {
  const { data } = await api.post('/auth/register', { email, password, ...profile });
  await AsyncStorage.setItem('token', data.token);
  if (data.refresh) await AsyncStorage.setItem('refresh', data.refresh);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  emitAuthChanged();
  return data.user;
}

export async function logout() {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('refresh');
  await AsyncStorage.removeItem('user');
  emitAuthChanged();
}

export async function getProfile() {
  const { data } = await api.get('/auth/profile');
  return data;
}

export async function updateProfile(updates) {
  const { data } = await api.put('/auth/profile', updates);
  await AsyncStorage.setItem('user', JSON.stringify(data));
  return data;
}

export async function deleteAccount() {
  await api.delete('/auth/account');
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  await AsyncStorage.removeItem('onboarding_completed');
  await AsyncStorage.removeItem('theme_selected');
  // Emit auth change to trigger UI update
  emitAuthChanged();
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
  return data;
}

export async function requestPasswordReset(email) {
  const { data } = await api.post('/auth/forgot', { email });
  return data; // { ok, token? }
}

export async function resetPassword(token, newPassword) {
  const { data } = await api.post('/auth/reset', { token, new_password: newPassword });
  return data; // { ok: true }
}

// Utility function to check if user is authenticated
export async function isAuthenticated() {
  const token = await AsyncStorage.getItem('token');
  if (!token) return false;
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    const refreshToken = await AsyncStorage.getItem('refresh');
    return !!refreshToken; // Return true if we have a refresh token to attempt refresh
  }
  
  return true;
}

// Utility function to check if user needs to login (no valid tokens)
export async function needsLogin() {
  const token = await AsyncStorage.getItem('token');
  const refreshToken = await AsyncStorage.getItem('refresh');
  
  if (!token || !refreshToken) return true;
  
  // If token is expired and no refresh token, need login
  if (isTokenExpired(token)) {
    return !refreshToken;
  }
  
  return false;
}

export async function listDreams(params = {}) {
  const search = new URLSearchParams();
  if (params.q) search.append('q', params.q);
  if (params.mood) search.append('mood', params.mood);
  if (params.tag) search.append('tag', params.tag);
  if (params.start_date) search.append('start_date', params.start_date);
  if (params.end_date) search.append('end_date', params.end_date);
  if (params.page) search.append('page', String(params.page));
  if (params.page_size) search.append('page_size', String(params.page_size));
  const url = `/dreams${search.toString() ? `?${search.toString()}` : ''}`;
  const { data } = await api.get(url);
  return data; // { items, page, page_size, total }
}

export async function createDream(payload) {
  const { data } = await api.post('/dreams', payload);
  return data;
}

export async function updateDream(id, payload) {
  const { data } = await api.put(`/dreams/${id}`, payload);
  return data;
}

export async function deleteDream(id) {
  await api.delete(`/dreams/${id}`);
}

export async function analyzeDream(dream) {
  const { data } = await api.post('/analysis', { dreamId: dream.id, content: dream.content });
  // Return just the response text for convenience
  return data?.response ?? data;
}

export async function getPatterns() {
  const { data } = await api.get('/analysis/patterns');
  return data;
}

export async function chat(history, message) {
  const { data } = await api.post('/chat', { history, message });
  return data;
}

export async function getChatHistory(limit = 50, offset = 0) {
  const { data } = await api.get(`/chat?limit=${limit}&offset=${offset}`);
  return data;
}

// New API endpoints for enhanced features
export async function getStatistics() {
  const { data } = await api.get('/statistics');
  return data;
}

export async function getMonthlyStats(months = 12) {
  const { data } = await api.get(`/statistics/monthly?months=${months}`);
  return data;
}

export async function getTagCloud() {
  const { data } = await api.get('/statistics/tags');
  return data;
}

export async function logMood(mood, dreamId) {
  const { data } = await api.post('/moods', { mood, dream_id: dreamId });
  return data;
}

export async function getMoodHistory(limit = 30) {
  const { data } = await api.get(`/moods?limit=${limit}`);
  return data.items;
}

export async function getMoodStats() {
  const { data } = await api.get('/moods/stats');
  return data;
}

export async function getMoodInsights() {
  const { data } = await api.get('/moods/insights');
  return data;
}

export async function getPrompts(category) {
  const url = category ? `/prompts?category=${category}` : '/prompts';
  const { data } = await api.get(url);
  return data;
}

export async function getRandomPrompt(category) {
  const url = category ? `/prompts/random?category=${category}` : '/prompts/random';
  const { data } = await api.get(url);
  return data;
}

export async function getRandomPrompts(count = 3, category) {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  const url = `/prompts/random/${count}?${params.toString()}`;
  const { data } = await api.get(url);
  return data;
}

export async function getPromptCategories() {
  const { data } = await api.get('/prompts/categories');
  return data;
}

export async function upgradePlan(plan, trialDays = 0) {
  const { data } = await api.post('/billing/upgrade', { plan, trial_days: trialDays });
  return data;
}

export async function getPricing() {
  const { data } = await api.get('/billing/pricing');
  return data;
}

export async function createCheckoutSession(priceId, trialDays = 7) {
  const { data } = await api.post('/billing/checkout', { priceId, trialDays });
  return data;
}

export async function createBillingPortalSession() {
  const { data } = await api.post('/billing/portal');
  return data;
}

export async function cancelSubscription(immediately = false) {
  const { data } = await api.post('/billing/cancel', { immediately });
  return data;
}


