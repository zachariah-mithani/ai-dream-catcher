import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = '30d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Verify user still exists in database
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function createUser(email, password, profile = {}) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new Error('Email already registered');
  
  // Check if username is taken
  if (profile.username) {
    const usernameTaken = db.prepare('SELECT id FROM users WHERE username = ?').get(profile.username);
    if (usernameTaken) throw new Error('Username already taken');
  }
  
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, username, theme_preference, bedtime_hour, bedtime_minute, wakeup_hour, wakeup_minute, notifications_enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    email, 
    password_hash, 
    profile.first_name || null,
    profile.last_name || null,
    profile.username || null,
    profile.theme_preference || 'dark',
    profile.bedtime_hour || 22,
    profile.bedtime_minute || 0,
    profile.wakeup_hour || 7,
    profile.wakeup_minute || 0,
    profile.notifications_enabled !== false ? 1 : 0
  );
  return { 
    id: info.lastInsertRowid, 
    email,
    first_name: profile.first_name,
    last_name: profile.last_name,
    username: profile.username,
    theme_preference: profile.theme_preference || 'dark',
    bedtime_hour: profile.bedtime_hour || 22,
    bedtime_minute: profile.bedtime_minute || 0,
    wakeup_hour: profile.wakeup_hour || 7,
    wakeup_minute: profile.wakeup_minute || 0,
    notifications_enabled: profile.notifications_enabled !== false
  };
}

export function authenticate(email, password) {
  const user = db.prepare('SELECT id, email, password_hash, first_name, last_name, username, theme_preference, bedtime_hour, bedtime_minute, wakeup_hour, wakeup_minute, notifications_enabled FROM users WHERE email = ?').get(email);
  if (!user) throw new Error('Invalid credentials');
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) throw new Error('Invalid credentials');
  return { 
    id: user.id, 
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    theme_preference: user.theme_preference || 'dark',
    bedtime_hour: user.bedtime_hour || 22,
    bedtime_minute: user.bedtime_minute || 0,
    wakeup_hour: user.wakeup_hour || 7,
    wakeup_minute: user.wakeup_minute || 0,
    notifications_enabled: user.notifications_enabled !== 0
  };
}

export function getUserProfile(userId) {
  const user = db.prepare('SELECT id, email, first_name, last_name, username, theme_preference, bedtime_hour, bedtime_minute, wakeup_hour, wakeup_minute, notifications_enabled, created_at FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');
  return {
    ...user,
    bedtime_hour: user.bedtime_hour || 22,
    bedtime_minute: user.bedtime_minute || 0,
    wakeup_hour: user.wakeup_hour || 7,
    wakeup_minute: user.wakeup_minute || 0,
    notifications_enabled: user.notifications_enabled !== 0
  };
}

export function updateUserProfile(userId, updates) {
  // Check if username is taken by another user
  if (updates.username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(updates.username, userId);
    if (existing) throw new Error('Username already taken');
  }
  
  const fields = [];
  const values = [];
  
  if (updates.first_name !== undefined) {
    fields.push('first_name = ?');
    values.push(updates.first_name);
  }
  if (updates.last_name !== undefined) {
    fields.push('last_name = ?');
    values.push(updates.last_name);
  }
  if (updates.username !== undefined) {
    fields.push('username = ?');
    values.push(updates.username);
  }
  if (updates.theme_preference !== undefined) {
    fields.push('theme_preference = ?');
    values.push(updates.theme_preference);
  }
  if (updates.bedtime_hour !== undefined) {
    fields.push('bedtime_hour = ?');
    values.push(updates.bedtime_hour);
  }
  if (updates.bedtime_minute !== undefined) {
    fields.push('bedtime_minute = ?');
    values.push(updates.bedtime_minute);
  }
  if (updates.wakeup_hour !== undefined) {
    fields.push('wakeup_hour = ?');
    values.push(updates.wakeup_hour);
  }
  if (updates.wakeup_minute !== undefined) {
    fields.push('wakeup_minute = ?');
    values.push(updates.wakeup_minute);
  }
  if (updates.notifications_enabled !== undefined) {
    fields.push('notifications_enabled = ?');
    values.push(updates.notifications_enabled ? 1 : 0);
  }
  
  if (fields.length === 0) return getUserProfile(userId);
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);
  
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserProfile(userId);
}

export function deleteUserAccount(userId) {
  // Delete all user data
  db.prepare('DELETE FROM analyses WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM user_moods WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM dreams WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return true;
}


