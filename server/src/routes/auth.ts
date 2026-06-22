import { Router } from 'express';
import {
  completePasswordReset,
  requestPasswordReset,
} from '../services/password-reset.js';

export const authRouter = Router();

authRouter.post('/request-password-reset', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    await requestPasswordReset(email);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset request failed';
    console.error('[auth/request-password-reset]', message);
    res.status(400).json({ error: message });
  }
});

authRouter.post('/complete-password-reset', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '').trim();
    if (!token || !password) {
      res.status(400).json({ error: 'Token and password are required' });
      return;
    }

    await completePasswordReset(token, password);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed';
    console.error('[auth/complete-password-reset]', message);
    res.status(400).json({ error: message });
  }
});
