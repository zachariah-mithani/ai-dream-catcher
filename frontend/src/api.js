import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants?.expoConfig?.extra?.API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export async function register(email, password, profile = {}) {
  const { data } = await api.post('/auth/register', { email, password, ...profile });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
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
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword
  });
  return data;
}

export async function listDreams() {
  const { data } = await api.get('/dreams');
  return data.items;
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
  return data;
}

export async function getPatterns() {
  const { data } = await api.get('/analysis/patterns');
  return data;
}

export async function chat(history, message) {
  const { data } = await api.post('/chat', { history, message });
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


