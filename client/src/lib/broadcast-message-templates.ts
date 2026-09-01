import { APP_NAME } from '@/constants';

export type BroadcastMessageTemplateCategory = 'new-month' | 'products' | 'general';

export interface BroadcastMessageTemplate {
  id: string;
  name: string;
  category: BroadcastMessageTemplateCategory;
  description?: string;
  subject: string;
  message: string;
  inboxFriendly?: boolean;
}

export const BROADCAST_MESSAGE_TEMPLATE_CATEGORIES: {
  id: BroadcastMessageTemplateCategory;
  label: string;
}[] = [
  { id: 'new-month', label: 'New month' },
  { id: 'products', label: 'Product updates' },
  { id: 'general', label: 'General' },
];

export const BROADCAST_MESSAGE_TEMPLATES: BroadcastMessageTemplate[] = [
  {
    id: 'happy-september-2026',
    name: 'Happy September — December ready (inbox-friendly)',
    category: 'new-month',
    description:
      'Welcome to September, four months to 2027, soft nudge to pick up logs before December. Best for Primary inbox when sent via Product Announcement.',
    subject: `Happy September from ${APP_NAME}`,
    inboxFriendly: true,
    message: `Happy new month — welcome to September. We hope this month brings you good energy and strong results.

Only four months remain before 2027. If you want to be set for December, now is a good time to pick up the logs and accounts you need from the marketplace below.

Browse the products listed, add wallet funds if your balance is low, and your details will appear in My Purchases after checkout.

Thank you for being with ${APP_NAME}.
Team ${APP_NAME}`,
  },
  {
    id: 'products-default',
    name: 'New products available',
    category: 'products',
    description: 'Standard marketplace product announcement with a short intro.',
    subject: `New products available on ${APP_NAME}`,
    inboxFriendly: true,
    message:
      'We just added new products to the marketplace. Browse the list below and click any product to view details.',
  },
  {
    id: 'happy-new-week',
    name: 'Happy new week — inbox-friendly',
    category: 'general',
    description: 'Short personal weekly greeting. Pair with selected products below.',
    subject: 'Happy new week',
    inboxFriendly: true,
    message: `Happy new week. I hope your weekend went well and that this week starts on a good note.

Just a short hello from ${APP_NAME}. Your account is here whenever you need it — browse the products below when you are ready.

Have a good week,
Team ${APP_NAME}`,
  },
  {
    id: 'restock-reminder',
    name: 'Fresh stock reminder — inbox-friendly',
    category: 'products',
    description: 'Soft note that selected products are available again.',
    subject: `Fresh stock on ${APP_NAME}`,
    inboxFriendly: true,
    message: `Hi there,

A quick note from ${APP_NAME}: the products below are available on the marketplace right now. Open any listing to view details and complete your order from your wallet.

Thank you,
Team ${APP_NAME}`,
  },
];

export const DEFAULT_BROADCAST_TEMPLATE_ID = 'products-default';

export function getBroadcastMessageTemplate(id: string) {
  return BROADCAST_MESSAGE_TEMPLATES.find((template) => template.id === id);
}

export function getBroadcastMessageTemplatesByCategory(category: BroadcastMessageTemplateCategory) {
  return BROADCAST_MESSAGE_TEMPLATES.filter((template) => template.category === category);
}
