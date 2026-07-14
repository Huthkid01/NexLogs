import { createContext } from 'react';
import { APP_NAME } from '@/constants';
import { normalizeWalletExchangeRates } from '@/lib/wallet-exchange-rates';
import { DEFAULT_SMS_PRICING, normalizeSmsProviderPricing, type SmsProviderPricingBundle } from '@/lib/sms-pricing';
import { DEFAULT_LOGGSPLUG_SETTINGS, normalizeLoggsplugSettings, type LoggsplugSettings } from '@/lib/loggsplug-pricing';
import { DEFAULT_TELEGRAM_SUPPORT_URL, normalizeTelegramUrl } from '@/lib/telegram-url';
import { normalizeWhatsAppUrl } from '@/lib/social-links';
import { DEFAULT_RDP_CATALOG, mergeRdpCatalog, type RdpCatalog } from '@/lib/rdp-catalog';

export interface SiteContent {
  slides: Array<{
    id: string;
    imageUrl: string;
    title: string;
    description: string;
    ctaLabel: string;
    linkUrl: string;
    order: number;
    active: boolean;
  }>;
  home: {
    subscriptionsTitle: string;
    purchaseRdpLabel: string;
    buyNumbersLabel: string;
    categoriesLabel: string;
    catalogTitle: string;
    loginPromptLabel: string;
    latestProductsLabel: string;
    browseAllProductsLabel: string;
    emptyCatalogTitle: string;
    emptyCatalogDescription: string;
    requestOnTelegramLabel: string;
    requestOnWhatsAppLabel: string;
  };
  about: {
    title: string;
    paragraphs: string[];
  };
  faq: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  support: {
    refundPolicyButtonLabel: string;
    title: string;
    intro: string;
    channels: Array<{
      title: string;
      description: string;
      href: string;
    }>;
    tutorialTitle: string;
    tutorialIntro: string;
    tutorials: Array<{
      title: string;
      description: string;
      label: string;
    }>;
  };
  terms: {
    title: string;
    lastUpdatedLabel: string;
    refundLinkLabel: string;
    contactEmail: string;
    sections: Array<{
      title: string;
      body: string;
      bullets?: string[];
    }>;
  };
  refund: {
    title: string;
    intro: string;
    rules: string[];
    supportLinkLabel: string;
    updateNote: string;
  };
  privacy: {
    title: string;
    lastUpdatedLabel: string;
    contactEmail: string;
    sections: Array<{
      title: string;
      body: string;
      bullets?: string[];
    }>;
  };
  footer: {
    brandDescription: string;
    legalTitle: string;
    connectTitle: string;
    trustTitle: string;
    trustItems: string[];
    telegramPromoTitle: string;
    telegramPromoDescription: string;
    socialLinks: Array<{
      label: string;
      href: string;
    }>;
  };
  wallet: {
    exchangeRates: Record<string, number>;
  };
  smsPricing: SmsProviderPricingBundle;
  loggsplug: LoggsplugSettings;
  rdp: RdpCatalog;
}

export const STORAGE_KEY = 'nexlogs-site-content';

const LEGACY_DEFAULT_SLIDE_TITLE = 'Nexlogs Main Banner';
const DEFAULT_SLIDE_TITLE = 'Marketplace Banner';
const LEGACY_DEFAULT_SLIDE_DESCRIPTION = 'Featured platforms and marketplace highlight banner.';
const DEFAULT_SLIDE_DESCRIPTION = 'Featured platforms and marketplace';
const LEGACY_DEFAULT_SLIDE_CTA = 'Shop Now';

export const defaultSiteContent: SiteContent = {
  slides: [
    {
      id: 'default-slide-1',
      imageUrl: '/images/hero-banner.png',
      title: DEFAULT_SLIDE_TITLE,
      description: DEFAULT_SLIDE_DESCRIPTION,
      ctaLabel: '',
      linkUrl: '/marketplace',
      order: 0,
      active: true,
    },
    {
      id: 'slide-telegram-support',
      imageUrl: '/images/hero-telegram-support.jpg',
      title: '',
      description: '',
      ctaLabel: '',
      linkUrl: 'https://telegram.me/nexlogs',
      order: 1,
      active: true,
    },
  ],
  home: {
    subscriptionsTitle: 'Subscriptions & others',
    purchaseRdpLabel: 'Purchase RDP',
    buyNumbersLabel: 'Buy Numbers',
    categoriesLabel: 'Shop by Categories',
    catalogTitle: 'Buy Logs',
    loginPromptLabel: 'Log in to view products',
    latestProductsLabel: 'Latest Products',
    browseAllProductsLabel: 'Browse all products',
    emptyCatalogTitle: 'Request a product',
    emptyCatalogDescription:
      'No products are available here right now. Contact customer support on Telegram or WhatsApp to request products and we will help you source what you need.',
    requestOnTelegramLabel: 'Message on Telegram',
    requestOnWhatsAppLabel: 'Message on WhatsApp',
  },
  about: {
    title: `About ${APP_NAME}`,
    paragraphs: [
      `${APP_NAME} is the premier marketplace for buying and selling verified social media accounts. We connect buyers with high-quality digital assets across Instagram, TikTok, YouTube, X, Facebook, and Snapchat.`,
      'Our mission is to make social media account transactions safe, transparent, and efficient. Every listing on our platform undergoes rigorous verification to ensure authenticity and quality.',
      `Founded with a vision to revolutionize the digital asset marketplace, ${APP_NAME} has helped thousands of entrepreneurs, agencies, and content creators acquire the social presence they need to grow their businesses.`,
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: 'Where is the main menu and wallet?',
        answer:
          'Use the menu icon (☰) on the top left for Marketplace, Buy Numbers, My Purchases, and Support. Your wallet balance is in the orange button on the top right — open it to add funds, view your profile, or sign out. Watch the walkthrough above for a 30-second visual guide.',
      },
      {
        question: 'How fast are orders delivered?',
        answer: 'Most eligible digital products are delivered shortly after payment verification, but some orders may require manual review.',
      },
      {
        question: 'Can I request a refund?',
        answer: 'Refunds and replacements are reviewed based on the issue reported, order status, and evidence provided through support.',
      },
      {
        question: 'Do I need an account to buy products?',
        answer: 'Yes. You need to sign in before viewing protected marketplace inventory and completing purchases.',
      },
      {
        question: 'How do I contact support?',
        answer: 'You can reach support through the support page by email or Telegram, depending on the available channels you configure.',
      },
    ],
  },
  support: {
    refundPolicyButtonLabel: 'Report / Refund policy',
    title: "Need Help? We're Here for You",
    intro: 'Choose a support channel below and our team will respond quickly.',
    channels: [
      {
        title: 'Telegram',
        description: 'Reach us via Telegram',
        href: 'https://telegram.me/nexlogs',
      },
      {
        title: 'Email',
        description: 'Send us an email',
        href: 'mailto:support@nexlogs.com',
      },
    ],
    tutorialTitle: 'Video Tutorials',
    tutorialIntro: 'Watch step-by-step guides on how to use the platform.',
    tutorials: [
      // Hidden on Support page until real videos are ready.
      // {
      //   title: 'How To Add Funds',
      //   description: 'A quick guide on funding your wallet securely.',
      //   label: 'How to add funds in wallet',
      // },
      // {
      //   title: 'How To Copy Order ID',
      //   description: 'Learn how to find and copy your order ID for support.',
      //   label: 'How to copy ORDER ID',
      // },
      // {
      //   title: 'How To Buy Foreign Numbers',
      //   description: 'Step-by-step guide to purchasing foreign numbers.',
      //   label: 'How to buy Foreign numbers',
      // },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    lastUpdatedLabel: 'Last updated:',
    refundLinkLabel: 'refund policy',
    contactEmail: 'support@nexlogs.com',
    sections: [
      {
        title: '1. Introduction',
        body: `${APP_NAME} provides digital marketplace services related to social media accounts and related digital products. By accessing or using our platform, you agree to comply with these Terms & Conditions. If you do not agree with any part of these terms, you should discontinue use of the platform immediately.`,
      },
      {
        title: '2. Eligibility',
        body: 'By using our services, you confirm that you are at least 18 years old or have reached the age of majority in your jurisdiction. You are responsible for ensuring that your use of the platform complies with all applicable local laws and regulations.',
      },
      {
        title: '3. Account Registration',
        body: `To access certain features on ${APP_NAME}, you may need to create an account. You agree to provide accurate, current, and complete information and to keep your account credentials secure. You are responsible for all activity that occurs under your account.`,
      },
      {
        title: '4. Use of Services',
        body: `You agree to use ${APP_NAME} only for lawful purposes and in accordance with these Terms & Conditions.`,
        bullets: [
          'Violate any applicable law, regulation, or third-party policy.',
          'Upload, transmit, or share harmful, misleading, or fraudulent content.',
          'Infringe on intellectual property rights or misuse another person’s identity.',
          'Attempt to interfere with the security, availability, or performance of the platform.',
        ],
      },
      {
        title: '5. Orders, Payments, and Refunds',
        body: `All purchases made through ${APP_NAME} must be paid in full unless otherwise stated. Due to the digital nature of our products and services, refund requests are reviewed based on the specific issue reported, order status, and supporting evidence submitted by the customer.`,
      },
      {
        title: '6. Intellectual Property',
        body: `All content, branding, designs, text, graphics, and platform technology made available through ${APP_NAME} remain the property of ${APP_NAME} or its licensors. You may not copy, reproduce, distribute, or exploit any part of the platform without prior written permission.`,
      },
      {
        title: '7. Limitation of Liability',
        body: `${APP_NAME} is provided on an "as available" basis. To the fullest extent permitted by law, we do not guarantee uninterrupted service and we are not liable for indirect, incidental, special, or consequential damages resulting from your use of the platform.`,
      },
      {
        title: '8. Account Suspension or Termination',
        body: `We reserve the right to suspend, restrict, or terminate access to ${APP_NAME} at any time if we believe a user has violated these Terms & Conditions, engaged in suspicious activity, or caused risk to the platform or other users.`,
      },
      {
        title: '9. Changes to These Terms',
        body: 'We may update these Terms & Conditions from time to time. When changes are made, the revised version will be posted on this page with an updated effective date. Continued use of the platform after changes are posted constitutes acceptance of those changes.',
      },
      {
        title: '10. Contact Us',
        body: 'If you have any questions about these Terms & Conditions, please contact our support team at',
      },
    ],
  },
  refund: {
    title: 'Refund Policy',
    intro: `We value your satisfaction at ${APP_NAME}. Please read this refund policy carefully to understand how refund and replacement requests are handled for digital products purchased through our platform.`,
    rules: [
      'Orders must be checked and reported as soon as possible after purchase using the proper support or report channel.',
      'You should contact support immediately after noticing an issue, not hours later after extended use.',
      'Please confirm that the issue existed before submitting a complaint or refund request.',
      'A screenshot or screen recording from login through the point where the issue appears may be required for review.',
      'Products cannot be replaced or refunded if they are restricted, blocked, flagged, or banned due to user activity after delivery.',
      'Bulk orders must be reviewed and reported within 24 hours if you want replacement consideration.',
      'Approved refund or replacement requests are processed within 1 to 24 hours depending on queue volume and support availability.',
    ],
    supportLinkLabel: 'Support Page',
    updateNote: 'This refund policy may be updated from time to time without prior notice. Please review this page periodically for the latest version.',
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdatedLabel: 'Last updated:',
    contactEmail: 'support@nexlogs.store',
    sections: [
      {
        title: '1. Introduction',
        body: `${APP_NAME} ("we", "us", or "our") operates the website at nexlogs.store and related services. This Privacy Policy explains what information we collect, how we use it, how we store it, and your choices. By using our platform, you agree to the practices described here.`,
      },
      {
        title: '2. Information We Collect',
        body: 'We collect information you provide directly and information generated when you use our services.',
        bullets: [
          'Account information: name and email address.',
          'Profile information: display name and avatar, if provided.',
          'Transaction information: wallet top-ups, purchases, order history, and support tickets.',
        ],
      },
      {
        title: '3. Google Sign-In and Google User Data',
        body: `${APP_NAME} offers optional "Sign in with Google" authentication. When you choose Google Sign-In, our application accesses limited Google user data only to create and secure your account. We comply with the Google API Services User Data Policy, including the Limited Use requirements.`,
      },
      {
        title: '3a. Google Data Accessed',
        body: 'Through Google Sign-In (OpenID Connect scopes: openid, email, and profile), we may access the following Google user data:',
        bullets: [
          'Your Google account email address.',
          'Your name (if available in your Google profile).',
          'Your profile picture URL (if available in your Google profile).',
          'A unique Google account identifier used to authenticate your account.',
        ],
      },
      {
        title: '3b. How We Use Google User Data',
        body: 'We use Google user data only for the following purposes:',
        bullets: [
          'Authenticate you and create or sign in to your Nexlogs account.',
          'Associate your account with orders, wallet balance, and purchase history.',
          'Display your name or profile image within your account, where applicable.',
          'Protect the platform from fraud, abuse, and unauthorized access.',
        ],
      },
      {
        title: '3c. Google Data Storage, Retention, and Sharing',
        body: 'Google user data received during sign-in is stored securely in our authentication and profile systems (hosted by Supabase). We retain this information while your account remains active or as needed to provide our services and meet legal obligations.',
        bullets: [
          'We do not sell Google user data.',
          'We do not use Google user data for advertising or marketing profiling.',
          'We do not use Google user data to train artificial intelligence or machine learning models.',
          'We do not share Google user data with third parties except infrastructure providers that host our application and only as needed to operate the service (for example, secure database and authentication hosting).',
        ],
      },
      {
        title: '3d. Your Choices for Google Data',
        body: 'You can stop using Google Sign-In by signing in with email and password instead, or by revoking Nexlogs access in your Google Account security settings at https://myaccount.google.com/permissions. To request account deletion or data removal, contact us at support@nexlogs.store.',
      },
      {
        title: '4. How We Use Your Information',
        body: 'We use collected information to operate the marketplace, process payments and wallet transactions, deliver digital products, provide customer support, send service-related communications, improve platform security, and comply with legal requirements.',
      },
      {
        title: '5. Data Security',
        body: 'We use industry-standard safeguards including encrypted connections (HTTPS), access controls, and secure hosting. No method of transmission or storage is completely secure, but we work to protect your information.',
      },
      {
        title: '6. Your Rights',
        body: 'Depending on your location, you may have rights to access, correct, or delete personal data we hold about you. Contact us to submit a request and we will respond within a reasonable time.',
      },
      {
        title: '7. Changes to This Policy',
        body: 'We may update this Privacy Policy from time to time. The revised version will be posted on this page with an updated date. Continued use of the platform after changes are posted means you accept the updated policy.',
      },
      {
        title: '8. Contact Us',
        body: 'If you have questions about this Privacy Policy or how we handle Google user data, contact us at',
      },
    ],
  },
  footer: {
    brandDescription: 'Secure digital marketplace with fast support and seamless transactions.',
    legalTitle: 'LEGAL',
    connectTitle: 'CONNECT WITH US',
    trustTitle: 'TRUST & SECURITY',
    trustItems: ['SSL Secured', 'Secure Payments', '24/7 Support'],
    telegramPromoTitle: 'Telegram channel/support',
    telegramPromoDescription: 'Daily updates on high-follower and monetized accounts.',
    socialLinks: [
      { label: 'Telegram', href: 'https://telegram.me/nexlogs' },
      { label: 'WhatsApp', href: 'https://wa.me/15855938030' },
    ],
  },
  wallet: {
    exchangeRates: {
      NGN: 1500,
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      GHS: 11.67,
      KES: 134.56,
      ZAR: 16.52,
      XOF: 565.62,
      XAF: 565.62,
    },
  },
  smsPricing: {
    smspool: {
      usdNgnRate: DEFAULT_SMS_PRICING.usdNgnRate,
      markupPercent: DEFAULT_SMS_PRICING.markupPercent,
    },
    fivesim: {
      usdNgnRate: DEFAULT_SMS_PRICING.usdNgnRate,
      markupPercent: DEFAULT_SMS_PRICING.markupPercent,
    },
  },
  loggsplug: DEFAULT_LOGGSPLUG_SETTINGS,
  rdp: DEFAULT_RDP_CATALOG,
};

export interface SiteContentContextType {
  content: SiteContent;
  setContent: (next: SiteContent) => void;
  resetContent: () => void;
}

export const SiteContentContext = createContext<SiteContentContextType | undefined>(undefined);

function normalizeSlides(slides?: SiteContent['slides'] | null): SiteContent['slides'] {
  if (!slides?.length) return defaultSiteContent.slides;

  return slides.map((slide) => {
    if (slide.id !== 'default-slide-1') {
      return {
        ...slide,
        ctaLabel: slide.ctaLabel ?? '',
      };
    }

    return {
      ...slide,
      title: !slide.title || slide.title === LEGACY_DEFAULT_SLIDE_TITLE ? DEFAULT_SLIDE_TITLE : slide.title,
      description: !slide.description || slide.description === LEGACY_DEFAULT_SLIDE_DESCRIPTION ? DEFAULT_SLIDE_DESCRIPTION : slide.description,
      ctaLabel: slide.ctaLabel === LEGACY_DEFAULT_SLIDE_CTA ? '' : (slide.ctaLabel ?? ''),
    };
  });
}

function normalizeHomeContent(
  home?: Partial<SiteContent['home']> & {
    buyBulkLabel?: string;
    requestOnInstagramLabel?: string;
  } | null,
): SiteContent['home'] {
  const legacyBulkLabel = home?.buyBulkLabel;
  const purchaseRdpLabel =
    home?.purchaseRdpLabel ??
    (legacyBulkLabel && legacyBulkLabel !== 'Buy In Bulk' ? legacyBulkLabel : defaultSiteContent.home.purchaseRdpLabel);
  const requestOnWhatsAppLabel =
    home?.requestOnWhatsAppLabel ??
    home?.requestOnInstagramLabel ??
    defaultSiteContent.home.requestOnWhatsAppLabel;

  return {
    ...defaultSiteContent.home,
    ...home,
    purchaseRdpLabel,
    requestOnWhatsAppLabel,
  };
}

function normalizeSupportChannels(
  channels?: SiteContent['support']['channels'] | null
): SiteContent['support']['channels'] {
  const source = channels ?? defaultSiteContent.support.channels;
  return source.map((channel) => {
    if (channel.title.toLowerCase() !== 'telegram') return channel;
    return {
      ...channel,
      href: normalizeTelegramUrl(channel.href) ?? DEFAULT_TELEGRAM_SUPPORT_URL,
    };
  });
}

function normalizeSocialLinks(
  links?: SiteContent['footer']['socialLinks'] | null
): SiteContent['footer']['socialLinks'] {
  const source = links ?? defaultSiteContent.footer.socialLinks;
  const telegram =
    source.find((link) => link.label.toLowerCase() === 'telegram') ??
    defaultSiteContent.footer.socialLinks.find((link) => link.label.toLowerCase() === 'telegram');
  const whatsapp =
    source.find((link) => link.label.toLowerCase() === 'whatsapp') ??
    defaultSiteContent.footer.socialLinks.find((link) => link.label.toLowerCase() === 'whatsapp');

  const normalized: SiteContent['footer']['socialLinks'] = [];

  if (telegram) {
    normalized.push({
      ...telegram,
      label: 'Telegram',
      href: normalizeTelegramUrl(telegram.href) ?? DEFAULT_TELEGRAM_SUPPORT_URL,
    });
  }

  if (whatsapp) {
    const resolvedWhatsApp = normalizeWhatsAppUrl(whatsapp.href) ?? whatsapp.href;
    if (resolvedWhatsApp) {
      normalized.push({
        ...whatsapp,
        label: 'WhatsApp',
        href: resolvedWhatsApp,
      });
    }
  }

  return normalized.length > 0 ? normalized : defaultSiteContent.footer.socialLinks;
}

function shouldRemovePrivacyBullet(text: string) {
  return /technical information/i.test(text);
}

function sanitizePrivacyBullet(text: string) {
  if (/account information/i.test(text) && /password/i.test(text)) {
    return 'Account information: name and email address.';
  }

  return text;
}

function normalizePrivacyBullets(bullets?: string[] | null) {
  if (!bullets) return undefined;

  return bullets
    .map(sanitizePrivacyBullet)
    .filter((bullet) => !shouldRemovePrivacyBullet(bullet));
}

function normalizePrivacySections(
  sections?: SiteContent['privacy']['sections'] | null,
): SiteContent['privacy']['sections'] {
  const merged = sections?.map((section, index) => ({
    ...defaultSiteContent.privacy.sections[index],
    ...section,
    bullets: normalizePrivacyBullets(section.bullets)
      ?? defaultSiteContent.privacy.sections[index]?.bullets,
  })) ?? defaultSiteContent.privacy.sections;

  return merged.map((section, index) => ({
    ...section,
    bullets: normalizePrivacyBullets(section.bullets)
      ?? defaultSiteContent.privacy.sections[index]?.bullets,
  }));
}

export function mergeSiteContent(content?: Partial<SiteContent> | null): SiteContent {
  return {
    slides: normalizeSlides(content?.slides),
    home: normalizeHomeContent(content?.home),
    about: {
      ...defaultSiteContent.about,
      ...content?.about,
      paragraphs: content?.about?.paragraphs ?? defaultSiteContent.about.paragraphs,
    },
    faq: {
      ...defaultSiteContent.faq,
      ...content?.faq,
      items: content?.faq?.items ?? defaultSiteContent.faq.items,
    },
    support: {
      ...defaultSiteContent.support,
      ...content?.support,
      channels: normalizeSupportChannels(content?.support?.channels),
      tutorials: content?.support?.tutorials ?? defaultSiteContent.support.tutorials,
    },
    terms: {
      ...defaultSiteContent.terms,
      ...content?.terms,
      sections: content?.terms?.sections?.map((section, index) => ({
        ...defaultSiteContent.terms.sections[index],
        ...section,
      })) ?? defaultSiteContent.terms.sections,
    },
    refund: {
      ...defaultSiteContent.refund,
      ...content?.refund,
      rules: content?.refund?.rules ?? defaultSiteContent.refund.rules,
    },
    privacy: {
      ...defaultSiteContent.privacy,
      ...content?.privacy,
      sections: normalizePrivacySections(content?.privacy?.sections),
    },
    footer: {
      ...defaultSiteContent.footer,
      ...content?.footer,
      trustItems: content?.footer?.trustItems ?? defaultSiteContent.footer.trustItems,
      socialLinks: normalizeSocialLinks(content?.footer?.socialLinks),
    },
    wallet: {
      exchangeRates: normalizeWalletExchangeRates(content?.wallet?.exchangeRates),
    },
    smsPricing: normalizeSmsProviderPricing(content?.smsPricing),
    loggsplug: normalizeLoggsplugSettings(content?.loggsplug),
    rdp: mergeRdpCatalog(content?.rdp),
  };
}
