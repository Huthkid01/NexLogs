import type { Category, Product, Profile } from '@/types';
import { getCategoryIconPath, getPlatformIconPath } from '@/lib/platform-icons';

const now = new Date().toISOString();

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-instagram', name: 'Instagram', slug: 'instagram', description: null, image_url: getCategoryIconPath({ name: 'Instagram', slug: 'instagram' }), is_active: true, sort_order: 1, created_at: now, updated_at: now },
  { id: 'cat-facebook', name: 'Facebook', slug: 'facebook', description: null, image_url: getCategoryIconPath({ name: 'Facebook', slug: 'facebook' }), is_active: true, sort_order: 2, created_at: now, updated_at: now },
  { id: 'cat-x', name: 'X (Twitter)', slug: 'x-twitter', description: null, image_url: getCategoryIconPath({ name: 'X (Twitter)', slug: 'x-twitter' }), is_active: true, sort_order: 3, created_at: now, updated_at: now },
  { id: 'cat-tiktok', name: 'TikTok', slug: 'tiktok', description: null, image_url: getCategoryIconPath({ name: 'TikTok', slug: 'tiktok' }), is_active: true, sort_order: 4, created_at: now, updated_at: now },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1', title: '1-5 MONTHS OLD USA TELEGRAM ACCOUNT', slug: 'usa-telegram-account',
    description: 'USA Telegram account aged 1-5 months • ready for marketing • clean history',
    platform: 'instagram', price: 2.89, stock: 10, followers: null, following: null, account_age: '3 months',
    country: 'United States', niche: 'Telegram', verified: false, featured: true, category_id: 'cat-instagram',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[0], product_images: [{ id: 'img-1', product_id: 'prod-1', image_url: getPlatformIconPath('instagram'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-2', title: 'CAPCUT PRO ACCOUNT', slug: 'capcut-pro-account',
    description: 'CapCut Pro subscription account • full features • instant delivery',
    platform: 'tiktok', price: 4, stock: 8, followers: null, following: null, account_age: '1 year',
    country: 'Global', niche: 'Editing', verified: false, featured: true, category_id: 'cat-tiktok',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[3], product_images: [{ id: 'img-2', product_id: 'prod-2', image_url: getPlatformIconPath('tiktok'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-3', title: 'CHAT GPT PLUS ACCOUNT', slug: 'chatgpt-plus-account',
    description: 'ChatGPT Plus account • premium access • shared or private options',
    platform: 'x', price: 5.5, stock: 5, followers: null, following: null, account_age: '6 months',
    country: 'Global', niche: 'AI', verified: true, featured: true, category_id: 'cat-x',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[2], product_images: [{ id: 'img-3', product_id: 'prod-3', image_url: getPlatformIconPath('x'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-4', title: '2015-2020 REAL USER ACCOUNT 500+ FOLLOWERS', slug: 'instagram-500-followers',
    description: '500+ followers foreign Instagram account • real user activity • email included',
    platform: 'instagram', price: 3.25, stock: 12, followers: 500, following: 120, account_age: '5 years',
    country: 'United States', niche: 'Lifestyle', verified: false, featured: true, category_id: 'cat-instagram',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[0], product_images: [{ id: 'img-4', product_id: 'prod-4', image_url: getPlatformIconPath('instagram'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-5', title: 'USA BIO ACCOUNT WITH FRIENDS', slug: 'usa-facebook-bio-account',
    description: 'Facebook account with English name • 2fa login • friends included • no mail access',
    platform: 'facebook', price: 2.2, stock: 20, followers: 150, following: 80, account_age: '2 years',
    country: 'United States', niche: 'Social', verified: false, featured: false, category_id: 'cat-facebook',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[1], product_images: [{ id: 'img-5', product_id: 'prod-5', image_url: getPlatformIconPath('facebook'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-6', title: '200+ FOLLOWERS TWITTER | 14 YEARS+', slug: 'twitter-200-followers',
    description: 'Aged Twitter account with 200+ followers • 2fa • hotmail included • mixed region',
    platform: 'x', price: 4, stock: 15, followers: 200, following: 50, account_age: '14 years',
    country: 'United States', niche: 'Crypto', verified: false, featured: false, category_id: 'cat-x',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[2], product_images: [{ id: 'img-6', product_id: 'prod-6', image_url: getPlatformIconPath('x'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-7', title: '500+ FOLLOWERS TWITTER ACCOUNT', slug: 'twitter-500-followers',
    description: 'Twitter/X account with 500+ real followers • clean engagement • instant transfer',
    platform: 'x', price: 7.5, stock: 9, followers: 500, following: 100, account_age: '8 years',
    country: 'United Kingdom', niche: 'Business', verified: false, featured: false, category_id: 'cat-x',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[2], product_images: [{ id: 'img-7', product_id: 'prod-7', image_url: getPlatformIconPath('x'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-8', title: '1K+ FOLLOWERS TWITTER ACCOUNT (USA)', slug: 'twitter-1k-followers-usa',
    description: 'USA Twitter account with 1,000+ followers • monetization ready • full access',
    platform: 'x', price: 11.89, stock: 6, followers: 1000, following: 200, account_age: '6 years',
    country: 'United States', niche: 'Marketing', verified: true, featured: false, category_id: 'cat-x',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[2], product_images: [{ id: 'img-8', product_id: 'prod-8', image_url: getPlatformIconPath('x'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-9', title: '500+ FOLLOWERS INSTAGRAM ACCOUNT | 2025', slug: 'instagram-500-2025',
    description: 'Fresh 2025 Instagram account • 500+ followers • niche-ready profile',
    platform: 'instagram', price: 3, stock: 11, followers: 500, following: 90, account_age: '6 months',
    country: 'Canada', niche: 'Fashion', verified: false, featured: false, category_id: 'cat-instagram',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[0], product_images: [{ id: 'img-9', product_id: 'prod-9', image_url: getPlatformIconPath('instagram'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-10', title: 'REAL ORGANIC 300K FOLLOWERS TIKTOK', slug: 'tiktok-300k-organic',
    description: '300,000 real organic Asia TikTok account • 6.6 million likes • viral content history',
    platform: 'tiktok', price: 225, stock: 2, followers: 300000, following: 400, account_age: '3 years',
    country: 'Asia', niche: 'Entertainment', verified: true, featured: true, category_id: 'cat-tiktok',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[3], product_images: [{ id: 'img-10', product_id: 'prod-10', image_url: getPlatformIconPath('tiktok'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-11', title: 'HQ FACEBOOK WITH 100-200 FRIENDS', slug: 'facebook-100-200-friends',
    description: 'High quality Facebook profile • 100-200 friends • USA IP • 2fa enabled',
    platform: 'facebook', price: 1.19, stock: 25, followers: 120, following: 60, account_age: '1 year',
    country: 'United States', niche: 'Social', verified: false, featured: false, category_id: 'cat-facebook',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[1], product_images: [{ id: 'img-11', product_id: 'prod-11', image_url: getPlatformIconPath('facebook'), sort_order: 0, created_at: now }],
  },
  {
    id: 'prod-12', title: 'HONGKONG FACEBOOK ACCOUNT', slug: 'hongkong-facebook-account',
    description: 'Hong Kong Facebook account • English interface • aged profile • marketing ready',
    platform: 'facebook', price: 2, stock: 14, followers: 80, following: 40, account_age: '18 months',
    country: 'Hong Kong', niche: 'Business', verified: false, featured: false, category_id: 'cat-facebook',
    is_active: true, created_at: now, updated_at: now,
    category: MOCK_CATEGORIES[1], product_images: [{ id: 'img-12', product_id: 'prod-12', image_url: getPlatformIconPath('facebook'), sort_order: 0, created_at: now }],
  },
];

export interface MockUserRecord {
  id: string;
  email: string;
  password: string;
  profile: Profile;
  balance: number;
}

export const MOCK_USERS: MockUserRecord[] = [
  {
    id: 'mock-user-demo',
    email: 'demo@nexlogs.com',
    password: 'Demo1234!',
    balance: 0.31,
    profile: {
      id: 'mock-user-demo',
      email: 'demo@nexlogs.com',
      full_name: 'Demo User',
      avatar_url: null,
      role: 'user',
      is_suspended: false,
      created_at: '2026-01-25T00:00:00.000Z',
      updated_at: now,
    },
  },
  {
    id: 'mock-user-admin',
    email: 'admin@nexlogs.com',
    password: 'Admin1234!',
    balance: 10,
    profile: {
      id: 'mock-user-admin',
      email: 'admin@nexlogs.com',
      full_name: 'Admin User',
      avatar_url: null,
      role: 'admin',
      is_suspended: false,
      created_at: now,
      updated_at: now,
    },
  },
];
