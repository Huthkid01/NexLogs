import { createContext } from 'react';
import { APP_NAME } from '@/constants';
import { normalizeWalletExchangeRates } from '@/lib/wallet-exchange-rates';
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
    buyBulkLabel: string;
    buyNumbersLabel: string;
    categoriesLabel: string;
    catalogTitle: string;
    loginPromptLabel: string;
    latestProductsLabel: string;
    browseAllProductsLabel: string;
  };
  about: {
    title: string;
    paragraphs: string[];
  };
  contact: {
    title: string;
    cardTitle: string;
    successMessage: string;
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
  footer: {
    brandDescription: string;
    legalTitle: string;
    connectTitle: string;
    trustTitle: string;
    trustItems: string[];
    socialLinks: Array<{
      label: string;
      href: string;
    }>;
  };
  wallet: {
    exchangeRates: Record<string, number>;
  };
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
  ],
  home: {
    subscriptionsTitle: 'Subscriptions & others',
    buyBulkLabel: 'Buy In Bulk',
    buyNumbersLabel: 'Buy Numbers',
    categoriesLabel: 'Shop by Categories',
    catalogTitle: 'Buy Logs',
    loginPromptLabel: 'Log in to view products',
    latestProductsLabel: 'Latest Products',
    browseAllProductsLabel: 'Browse all products',
  },
  about: {
    title: `About ${APP_NAME}`,
    paragraphs: [
      `${APP_NAME} is the premier marketplace for buying and selling verified social media accounts. We connect buyers with high-quality digital assets across Instagram, TikTok, YouTube, X, Facebook, and Snapchat.`,
      'Our mission is to make social media account transactions safe, transparent, and efficient. Every listing on our platform undergoes rigorous verification to ensure authenticity and quality.',
      `Founded with a vision to revolutionize the digital asset marketplace, ${APP_NAME} has helped thousands of entrepreneurs, agencies, and content creators acquire the social presence they need to grow their businesses.`,
    ],
  },
  contact: {
    title: 'Contact Us',
    cardTitle: 'Send us a message',
    successMessage: 'Message sent! We will get back to you soon.',
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
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
        href: 'https://t.me/',
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
      {
        title: 'How To Add Funds',
        description: 'A quick guide on funding your wallet securely.',
        label: 'How to add funds in wallet',
      },
      {
        title: 'How To Copy Order ID',
        description: 'Learn how to find and copy your order ID for support.',
        label: 'How to copy ORDER ID',
      },
      {
        title: 'How To Buy Foreign Numbers',
        description: 'Step-by-step guide to purchasing foreign numbers.',
        label: 'How to buy Foreign numbers',
      },
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
  footer: {
    brandDescription: 'Secure digital marketplace with fast support and seamless transactions.',
    legalTitle: 'LEGAL',
    connectTitle: 'CONNECT WITH US',
    trustTitle: 'TRUST & SECURITY',
    trustItems: ['SSL Secured', 'Secure Payments', '24/7 Support'],
    socialLinks: [
      { label: 'Telegram', href: '#' },
      { label: 'YouTube', href: '#' },
      { label: 'Link', href: '#' },
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

export function mergeSiteContent(content?: Partial<SiteContent> | null): SiteContent {
  return {
    slides: normalizeSlides(content?.slides),
    home: {
      ...defaultSiteContent.home,
      ...content?.home,
    },
    about: {
      ...defaultSiteContent.about,
      ...content?.about,
      paragraphs: content?.about?.paragraphs ?? defaultSiteContent.about.paragraphs,
    },
    contact: {
      ...defaultSiteContent.contact,
      ...content?.contact,
    },
    faq: {
      ...defaultSiteContent.faq,
      ...content?.faq,
      items: content?.faq?.items ?? defaultSiteContent.faq.items,
    },
    support: {
      ...defaultSiteContent.support,
      ...content?.support,
      channels: content?.support?.channels ?? defaultSiteContent.support.channels,
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
    footer: {
      ...defaultSiteContent.footer,
      ...content?.footer,
      trustItems: content?.footer?.trustItems ?? defaultSiteContent.footer.trustItems,
      socialLinks: content?.footer?.socialLinks ?? defaultSiteContent.footer.socialLinks,
    },
    wallet: {
      exchangeRates: normalizeWalletExchangeRates(content?.wallet?.exchangeRates),
    },
    rdp: mergeRdpCatalog(content?.rdp),
  };
}
