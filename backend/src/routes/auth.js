import express from 'express';
import { z } from 'zod';
import { authenticate, createUser, signToken, getUserProfile, updateUserProfile, deleteUserAccount, requireAuth, changeUserPassword, createPasswordResetToken, resetPasswordWithToken, issueRefreshToken, rotateRefreshToken } from '../auth.js';

export const authRouter = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().min(3).max(20).optional(),
  theme_preference: z.enum(['dreamy', 'minimalistLight', 'minimalistBlack']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().min(3).max(20).optional(),
  theme_preference: z.enum(['dreamy', 'minimalistLight', 'minimalistBlack']).optional(),
  bedtime_hour: z.number().min(0).max(23).optional(),
  bedtime_minute: z.number().min(0).max(59).optional(),
  wakeup_hour: z.number().min(0).max(23).optional(),
  wakeup_minute: z.number().min(0).max(59).optional(),
  notifications_enabled: z.boolean().optional()
});

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password, ...profile } = parse.data;
  try {
    const user = await createUser(email, password, profile);
    const access = signToken(user);
    const refresh = await issueRefreshToken(user.id);
    res.json({ token: access, refresh, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password } = parse.data;
  try {
    const user = await authenticate(email, password);
    const access = signToken(user);
    const refresh = await issueRefreshToken(user.id);
    res.json({ token: access, refresh, user });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});
// Refresh access token
const refreshSchema = z.object({ refresh: z.string().min(10) });
authRouter.post('/refresh', async (req, res) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const result = await rotateRefreshToken(parse.data.refresh);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


authRouter.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.id);
    res.json(profile);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

authRouter.put('/profile', requireAuth, async (req, res) => {
  const parse = profileUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const updatedProfile = await updateUserProfile(req.user.id, parse.data);
    res.json(updatedProfile);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

authRouter.delete('/account', requireAuth, async (req, res) => {
  try {
    await deleteUserAccount(req.user.id);
    res.json({ message: 'Account and all data deleted successfully' });
  } catch (e) {
    console.error('Account deletion error:', e);
    res.status(500).json({ error: e.message || 'Failed to delete account' });
  }
});


const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6)
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { current_password, new_password } = parse.data;
  try {
    await changeUserPassword(req.user.id, current_password, new_password);
    res.json({ message: 'Password updated successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


// Forgot password request
const forgotSchema = z.object({ email: z.string().email() });
authRouter.post('/forgot', async (req, res) => {
  const parse = forgotSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const result = await createPasswordResetToken(parse.data.email);
    // In a real app, email the token link. For now return token for testing only.
    res.json({ ok: true, token: result?.token || null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create reset token' });
  }
});

// Reset password using token
const resetSchema = z.object({ token: z.string().min(10), new_password: z.string().min(6) });
authRouter.post('/reset', async (req, res) => {
  const parse = resetSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    await resetPasswordWithToken(parse.data.token, parse.data.new_password);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

