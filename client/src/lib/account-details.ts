import type { Product } from '@/types';

export interface AccountDetailField {
  label: string;
  value: string;
}

export interface AccountDetails {
  fields: AccountDetailField[];
  fullCredentials: string;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAccountDetails(product: Product, variantId: string): AccountDetails {
  const seed = hashSeed(`${product.id}-${variantId}`);
  const platform = product.platform;
  const username = `${platform}_user_${1000 + (seed % 9000)}`;
  const password = `Nx${(seed % 100000).toString().padStart(5, '0')}!`;
  const email = `${username}@maildemo.com`;
  const emailPassword = `Mail${(seed % 10000).toString().padStart(4, '0')}`;
  const twoFactor = `${(seed % 1000000).toString().padStart(6, '0')}`;

  const fields: AccountDetailField[] = [
    { label: 'Username', value: username },
    { label: 'Password', value: password },
    { label: 'Email', value: email },
    { label: 'Email Password', value: emailPassword },
    { label: '2FA Code', value: twoFactor },
  ];

  const fullCredentials = `${username}:${password}:${email}:${emailPassword}:${twoFactor}`;

  return { fields, fullCredentials };
}

const EMAIL_DOMAINS = [
  'arltdebord.com',
  'maildemo.com',
  'inboxsecure.net',
  'protonmail.demo',
  'fastmailbox.io',
];

function generatePassword(seed: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  let value = seed;
  for (let i = 0; i < 10; i += 1) {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    result += chars[value % chars.length];
  }
  return result;
}

function generateMailPassword(seed: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  let result = '';
  let value = seed + 7919;
  for (let i = 0; i < 12; i += 1) {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    result += chars[value % chars.length];
  }
  return result;
}

function generateTwoFactorKey(seed: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let value = seed + 31337;
  for (let i = 0; i < 32; i += 1) {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    result += chars[value % chars.length];
  }
  return result;
}

function getPlatformGuide(platform: Product['platform']): string {
  switch (platform) {
    case 'facebook':
      return '⚠️ Facebook guide ⚠️ AFTER LOGIN , click on "Try another way" >>click on authentication app .. Get code from 2fa link by inserting your 2fa code https://2fa.fb.tools/';
    case 'instagram':
      return '⚠️ Instagram guide ⚠️ Login with uid:pass:mail:mailpass:2fa format. Use https://2fa.fb.tools/ for 2FA codes when prompted.';
    case 'tiktok':
      return '⚠️ TikTok guide ⚠️ Login with the credentials below. Enable 2FA via the linked email if required.';
    case 'x':
      return '⚠️ Twitter/X guide ⚠️ Login with uid:pass:mail:mailpass:2fa format. Use the 2FA key when authentication is requested.';
    case 'youtube':
      return '⚠️ YouTube guide ⚠️ Sign in with the Google credentials below. Use 2FA backup codes if prompted.';
    case 'snapchat':
      return '⚠️ Snapchat guide ⚠️ Login with the credentials below. Verify via email if required.';
    default:
      return '⚠️ Account guide ⚠️ Login with uid:pass:mail:mailpass:2fa format. Use https://2fa.fb.tools/ for 2FA codes when prompted.';
  }
}

function getProfileUrl(platform: Product['platform'], uid: string): string {
  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/profile.php?id=${uid}`;
    case 'instagram':
      return `https://www.instagram.com/${uid}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${uid}`;
    case 'x':
      return `https://x.com/${uid}`;
    case 'youtube':
      return `https://www.youtube.com/channel/${uid}`;
    case 'snapchat':
      return `https://www.snapchat.com/add/${uid}`;
    default:
      return `https://profile.example.com/${uid}`;
  }
}

export function getProductLog(product: Product, seed: string): string {
  const savedDetails = product.product_details?.trim();
  if (savedDetails) return savedDetails;

  const hash = hashSeed(`${product.id}-${seed}`);
  const uid = (600000000000 + (hash % 99999999999)).toString();
  const password = generatePassword(hash);
  const email = `user${hash % 10000}@${EMAIL_DOMAINS[hash % EMAIL_DOMAINS.length]}`;
  const mailPassword = generateMailPassword(hash);
  const twoFactorKey = generateTwoFactorKey(hash);

  const guide = getPlatformGuide(product.platform);
  const credentials = `${uid}:${password}:${email}:${mailPassword}:${twoFactorKey}`;
  const profileUrl = getProfileUrl(product.platform, uid);

  return `${guide}\n\n${credentials}\n\n${profileUrl}`;
}
