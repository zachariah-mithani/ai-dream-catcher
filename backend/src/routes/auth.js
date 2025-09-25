import express from 'express';
import { z } from 'zod';
import { authenticate, createUser, signToken, getUserProfile, updateUserProfile, deleteUserAccount, requireAuth } from '../auth.js';

export const authRouter = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().min(3).max(20).optional(),
  theme_preference: z.enum(['light', 'dark']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().min(3).max(20).optional(),
  theme_preference: z.enum(['light', 'dark']).optional(),
  bedtime_hour: z.number().min(0).max(23).optional(),
  bedtime_minute: z.number().min(0).max(59).optional(),
  wakeup_hour: z.number().min(0).max(23).optional(),
  wakeup_minute: z.number().min(0).max(59).optional(),
  notifications_enabled: z.boolean().optional()
});

authRouter.post('/register', (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password, ...profile } = parse.data;
  try {
    const user = createUser(email, password, profile);
    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

authRouter.post('/login', (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password } = parse.data;
  try {
    const user = authenticate(email, password);
    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

authRouter.get('/profile', requireAuth, (req, res) => {
  try {
    const profile = getUserProfile(req.user.id);
    res.json(profile);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

authRouter.put('/profile', requireAuth, (req, res) => {
  const parse = profileUpdateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const updatedProfile = updateUserProfile(req.user.id, parse.data);
    res.json(updatedProfile);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

authRouter.delete('/account', requireAuth, (req, res) => {
  try {
    deleteUserAccount(req.user.id);
    res.json({ message: 'Account and all data deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});


