import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './database.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_DAYS = 30;

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    userId,
    token,
    db.isPostgres ? expiresAt.toISOString().replace('T', ' ').replace('Z', '') : expiresAt.toISOString()
  );
  return token;
}

export async function rotateRefreshToken(oldToken) {
  const row = await db.prepare('SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token = ?').get(oldToken);
  if (!row) throw new Error('Invalid refresh token');
  const now = Date.now();
  const exp = new Date(row.expires_at).getTime();
  if (row.revoked || isNaN(exp) || exp < now) throw new Error('Expired refresh token');
  await db.prepare('UPDATE refresh_tokens SET revoked = ? WHERE id = ?').run(true, row.id);
  const newToken = await issueRefreshToken(row.user_id);
  const user = await db.prepare('SELECT id, email FROM users WHERE id = ?').get(row.user_id);
  const access = signToken(user);
  return { access, refresh: newToken };
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Verify user still exists in database
    const user = await db.prepare('SELECT id, email FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, email: user.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function createUser(email, password, profile = {}) {
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new Error('Email already registered');
  
  // Check if username is taken
  if (profile.username) {
    const usernameTaken = await db.prepare('SELECT id FROM users WHERE username = ?').get(profile.username);
    if (usernameTaken) throw new Error('Username already taken');
  }
  
  const password_hash = bcrypt.hashSync(password, 10);
  const info = await db.prepare(`
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
    profile.notifications_enabled !== false
  );
  return { 
    id: info.lastInsertRowid, 
    email,
    email_verified: false,
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

export async function authenticate(email, password) {
  const user = await db.prepare('SELECT id, email, password_hash, first_name, last_name, username, theme_preference, bedtime_hour, bedtime_minute, wakeup_hour, wakeup_minute, notifications_enabled FROM users WHERE email = ?').get(email);
  if (!user) throw new Error('Invalid credentials');
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) throw new Error('Invalid credentials');
  return { 
    id: user.id, 
    email: user.email,
    email_verified: Boolean(user.email_verified),
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    theme_preference: user.theme_preference || 'dark',
    bedtime_hour: user.bedtime_hour || 22,
    bedtime_minute: user.bedtime_minute || 0,
    wakeup_hour: user.wakeup_hour || 7,
    wakeup_minute: user.wakeup_minute || 0,
    notifications_enabled: Boolean(user.notifications_enabled)
  };
}

export async function getUserProfile(userId) {
  const user = await db.prepare('SELECT id, email, email_verified, first_name, last_name, username, theme_preference, bedtime_hour, bedtime_minute, wakeup_hour, wakeup_minute, notifications_enabled, created_at FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');
  return {
    ...user,
    bedtime_hour: user.bedtime_hour || 22,
    bedtime_minute: user.bedtime_minute || 0,
    wakeup_hour: user.wakeup_hour || 7,
    wakeup_minute: user.wakeup_minute || 0,
    notifications_enabled: Boolean(user.notifications_enabled)
  };
}

export async function updateUserProfile(userId, updates) {
  // Check if username is taken by another user
  if (updates.username) {
    const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(updates.username, userId);
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
  if (updates.email_verified !== undefined) {
    fields.push('email_verified = ?');
    values.push(!!updates.email_verified);
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
    values.push(!!updates.notifications_enabled);
  }
  
  if (fields.length === 0) return await getUserProfile(userId);
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);
  
  await db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return await getUserProfile(userId);
}

export async function deleteUserAccount(userId) {
  // Delete all user data
  await db.prepare('DELETE FROM analyses WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM user_moods WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM dreams WHERE user_id = ?').run(userId);
  await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return true;
}


export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');
  const ok = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!ok) throw new Error('Current password is incorrect');
  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);
  return true;
}


// Forgot password helpers
export async function createPasswordResetToken(email) {
  const user = await db.prepare('SELECT id, email FROM users WHERE email = ?').get(email);
  if (!user) return null; // Do not reveal account existence
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
  await db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    user.id,
    token,
    db.isPostgres ? expiresAt.toISOString().replace('T', ' ').replace('Z', '') : expiresAt.toISOString()
  );
  return { token };
}

// Email verification helpers
export async function createEmailVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  await db.prepare('INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)').run(
    userId,
    token,
    db.isPostgres ? expiresAt.toISOString().replace('T', ' ').replace('Z', '') : expiresAt.toISOString()
  );
  return { token };
}

export async function verifyEmailWithToken(token) {
  const row = await db.prepare('SELECT id, user_id, expires_at, used FROM email_verifications WHERE token = ?').get(token);
  if (!row) throw new Error('Invalid or expired token');
  const now = Date.now();
  const exp = new Date(row.expires_at).getTime();
  if (row.used || isNaN(exp) || exp < now) throw new Error('Invalid or expired token');
  await db.prepare('UPDATE users SET email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(true, row.user_id);
  await db.prepare('UPDATE email_verifications SET used = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(true, row.id);
  return true;
}

export async function resetPasswordWithToken(token, newPassword) {
  const reset = await db.prepare('SELECT id, user_id, token, expires_at, used FROM password_resets WHERE token = ?').get(token);
  if (!reset) throw new Error('Invalid or expired token');
  const now = Date.now();
  const expires = new Date(reset.expires_at).getTime();
  if (reset.used || isNaN(expires) || expires < now) throw new Error('Invalid or expired token');
  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, reset.user_id);
  await db.prepare('UPDATE password_resets SET used = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(true, reset.id);
  return true;
}

