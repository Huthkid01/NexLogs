import cors from 'cors';
import express from 'express';
import { env } from './env.js';
import { authRouter } from './routes/auth.js';
import { emailRouter } from './routes/email.js';

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'nexlogs-email-api' });
});

app.use('/api/email', emailRouter);
app.use('/api/auth', authRouter);

app.listen(env.port, () => {
  console.log(`Nexlogs email API listening on http://localhost:${env.port}`);
});
