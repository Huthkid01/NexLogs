export const SEO_SITE_URL = 'https://www.nexlogs.site';
export const SEO_SITE_NAME = 'Nexlogs';
export const SEO_DEFAULT_TITLE =
  'Nexlogs | Digital Marketplace for SMS Numbers, RDP & Social Products';
export const SEO_DEFAULT_DESCRIPTION =
  'Nexlogs (nexlogs.site) is a Nigeria digital marketplace for SMS verification numbers, RDP plans, and verified digital social products with secure wallet checkout.';
export const SEO_OG_IMAGE = `${SEO_SITE_URL}/images/og-nexlogs.jpg`;

export type SeoPageConfig = {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export function absoluteUrl(path = '/') {
  if (path.startsWith('http')) return path;
  return `${SEO_SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildPageTitle(title: string) {
  if (title.includes('Nexlogs') || title.includes('NexLogs')) return title;
  return `${title} | Nexlogs`;
}

export const SEO_PAGES = {
  home: {
    title: SEO_DEFAULT_TITLE,
    description: SEO_DEFAULT_DESCRIPTION,
    path: '/',
  },
  about: {
    title: 'About Nexlogs',
    description:
      'Learn about Nexlogs (nexlogs.site), a digital marketplace for SMS verification numbers, RDP plans, and verified social products with wallet checkout in Nigeria.',
    path: '/about',
  },
  faq: {
    title: 'Nexlogs FAQ — SMS Numbers, RDP & Marketplace Help',
    description:
      'Answers to common Nexlogs questions: how to buy SMS verification numbers, RDP plans, fund your wallet, delivery times, refunds, and support.',
    path: '/faq',
  },
  support: {
    title: 'Nexlogs Support — Telegram & Email Help',
    description:
      'Contact Nexlogs support by Telegram or email for order help, wallet questions, SMS numbers, RDP plans, and marketplace purchases.',
    path: '/support',
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Read how Nexlogs collects, uses, and protects personal data on nexlogs.site.',
    path: '/privacy',
  },
  terms: {
    title: 'Terms & Conditions',
    description: 'Terms and conditions for using the Nexlogs digital marketplace.',
    path: '/terms',
  },
  refund: {
    title: 'Refund Policy',
    description: 'Nexlogs refund and replacement policy for marketplace, SMS, and RDP orders.',
    path: '/refund',
  },
  buyNumbers: {
    title: 'Buy SMS Verification Numbers Nigeria | Nexlogs',
    description:
      'Buy virtual SMS verification numbers on Nexlogs. Choose country and service, pay from your wallet, and receive OTP codes in your account.',
    path: '/buy-numbers',
  },
  purchaseRdp: {
    title: 'Buy RDP Plans Nigeria | Nexlogs',
    description:
      'Buy RDP plans on Nexlogs. Compare options, checkout with your wallet, and get remote desktop fulfillment after purchase.',
    path: '/purchase-rdp',
  },
} as const satisfies Record<string, SeoPageConfig>;
