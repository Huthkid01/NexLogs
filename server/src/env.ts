import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

export const env = {
  port: Number(process.env.EMAIL_API_PORT || process.env.PORT || 3001),
  appUrl: (process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  appName: process.env.APP_NAME || process.env.VITE_APP_NAME || 'Nexlogs',
  smtpHost: process.env.SMTP_HOST || 'smtp.hostinger.com',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE !== 'false',
  smtpUser: () => required('SMTP_USER'),
  smtpPass: () => required('SMTP_PASS'),
  emailFromName: process.env.EMAIL_FROM_NAME || process.env.APP_NAME || 'Nexlogs',
  emailFromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || '',
  emailWebhookSecret: () => required('EMAIL_WEBHOOK_SECRET'),
  supabaseUrl: () => required('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  clientOrigins: (process.env.CLIENT_ORIGINS || process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

function required(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}
