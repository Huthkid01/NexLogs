import { Router } from 'express';
import { env } from '../env.js';
import {
  sendTransactionalEmail,
  type TransactionalEmailType,
} from '../services/transactional-email.js';

export const emailRouter = Router();

emailRouter.post('/send', async (req, res) => {
  try {
    const providedSecret = req.header('x-email-webhook-secret');
    if (providedSecret !== env.emailWebhookSecret()) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const type = String(req.body?.type || '').trim() as TransactionalEmailType;
    if (!type) {
      res.status(400).json({ error: 'Missing email type' });
      return;
    }

    await sendTransactionalEmail({
      type,
      userId: req.body?.user_id ? String(req.body.user_id) : undefined,
      orderId: req.body?.order_id ? String(req.body.order_id) : undefined,
      transactionId: req.body?.transaction_id ? String(req.body.transaction_id) : undefined,
    });

    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Send email failed';
    console.error('[email/send]', message);
    res.status(500).json({ error: message });
  }
});
