import type { PlatformType } from '@/types';

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Nexlogs';
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

export const PLATFORMS: { value: PlatformType; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', color: 'from-pink-500 to-purple-600' },
  { value: 'tiktok', label: 'TikTok', color: 'from-gray-900 to-gray-700' },
  { value: 'youtube', label: 'YouTube', color: 'from-red-600 to-red-500' },
  { value: 'x', label: 'X (Twitter)', color: 'from-gray-800 to-gray-600' },
  { value: 'facebook', label: 'Facebook', color: 'from-blue-600 to-blue-500' },
  { value: 'snapchat', label: 'Snapchat', color: 'from-yellow-400 to-yellow-300' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Lowest Price' },
  { value: 'price_desc', label: 'Highest Price' },
  { value: 'popular', label: 'Most Popular' },
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Support' },
];

export const FOOTER_LINKS = {
  company: [
    { href: '/about', label: 'About Us' },
  ],
  support: [
    { href: '/faq', label: 'FAQ' },
    { href: '/support', label: 'Support' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
};

export const STATS = [
  { label: 'Accounts Sold', value: '2,500+' },
  { label: 'Happy Customers', value: '1,800+' },
  { label: 'Platforms', value: '6' },
  { label: 'Success Rate', value: '99.2%' },
];
