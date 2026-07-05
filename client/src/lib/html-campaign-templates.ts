import { APP_NAME, APP_URL } from '@/constants';

export type HtmlCampaignTemplateCategory = 'general' | 'marketing' | 'account';

export interface HtmlCampaignTemplate {
  id: string;
  name: string;
  category: HtmlCampaignTemplateCategory;
  description?: string;
  defaultSubject?: string;
  html: string;
}

export const HTML_CAMPAIGN_TEMPLATE_CATEGORIES: {
  id: HtmlCampaignTemplateCategory;
  label: string;
}[] = [
  { id: 'marketing', label: 'Email marketing' },
  { id: 'account', label: 'Account emails' },
  { id: 'general', label: 'General' },
];

const appUrl = APP_URL.replace(/\/$/, '');
const siteHost = appUrl.replace(/^https?:\/\//, '');
const telegramSupportUrl = 'https://t.me/nexlogs';

function buildTextLink(url: string, label: string) {
  return `<p style="margin:20px 0 0;font-size:15px;line-height:1.7;">
    <a href="${url}" style="color:#0f172a;text-decoration:underline;">${label}</a>
  </p>`;
}

function buildPlainEmailHtml(options: {
  title: string;
  preheader: string;
  bodyHtml: string;
  linkUrl?: string;
  linkLabel?: string;
}) {
  const textLink =
    options.linkUrl && options.linkLabel
      ? buildTextLink(options.linkUrl, options.linkLabel)
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${options.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
          <tr>
            <td style="padding:0 0 14px;font-size:13px;line-height:1.6;color:#6b7280;">
              <a href="${appUrl}" style="color:#111827;font-weight:700;text-decoration:none;">${APP_NAME}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 18px;">
              <h1 style="margin:0;font-size:24px;line-height:1.35;font-weight:700;color:#111827;">${options.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0;font-size:16px;line-height:1.7;color:#374151;">
              ${options.bodyHtml}
              ${textLink}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6b7280;">
                Questions? Reply to this email or contact
                <a href="mailto:support@nexlogs.store" style="color:#111827;text-decoration:underline;">support@nexlogs.store</a>.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                © ${new Date().getFullYear()} ${APP_NAME}. <a href="${appUrl}" style="color:#111827;text-decoration:underline;">${siteHost}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMarketingEmailHtml(options: {
  title: string;
  preheader: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  heroTitle?: string;
  compactLogo?: boolean;
}) {
  return buildPlainEmailHtml({
    title: options.heroTitle ?? options.title,
    preheader: options.preheader,
    bodyHtml: options.bodyHtml,
    linkUrl: options.ctaUrl,
    linkLabel: options.ctaLabel,
  });
}

function buildInboxFriendlyEmailHtml(options: {
  title: string;
  preheader: string;
  bodyHtml: string;
  linkUrl?: string;
  linkLabel?: string;
}) {
  return buildPlainEmailHtml(options);
}

export const HTML_CAMPAIGN_TEMPLATES: HtmlCampaignTemplate[] = [
  {
    id: 'marketing-intro',
    name: 'Introduce Nexlogs',
    category: 'marketing',
    description: 'Introduce your brand to new subscribers or cold contacts.',
    defaultSubject: `Discover ${APP_NAME} — digital products made simple`,
    html: buildMarketingEmailHtml({
      title: `Discover ${APP_NAME}`,
      preheader: `Browse digital products on ${APP_NAME}. Simple checkout and fast delivery.`,
      heroTitle: 'Welcome to Nexlogs',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                <strong>${APP_NAME}</strong> is a marketplace for digital products — social accounts, tools, and services you can browse and purchase in a few clicks.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                Create a free account to add funds, place orders, and track your purchases from one dashboard.
              </p>
              <ul style="margin:0 0 8px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Curated catalog with clear pricing</li>
                <li>Secure wallet for quick checkout</li>
                <li>Order history and support when you need it</li>
              </ul>`,
      ctaLabel: 'Explore the marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'marketing-marketplace-update',
    name: 'Marketplace update',
    category: 'marketing',
    description: 'Tell contacts about new listings and catalog updates.',
    defaultSubject: `New on ${APP_NAME} — see what just landed`,
    html: buildMarketingEmailHtml({
      title: 'Marketplace update',
      preheader: `Fresh listings and updates are live on ${APP_NAME} today.`,
      heroTitle: 'New on the marketplace',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                We refreshed our marketplace with new products and updated listings. Whether you are buying for the first time or checking back in, there is plenty to explore.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;"><strong>This week on ${APP_NAME}</strong></p>
              <ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>New product categories added</li>
                <li>Updated pricing on selected items</li>
                <li>Faster checkout from your wallet balance</li>
              </ul>`,
      ctaLabel: 'Browse marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'marketing-newsletter',
    name: 'Newsletter',
    category: 'marketing',
    description: 'Multi-section newsletter for regular marketing sends.',
    defaultSubject: `${APP_NAME} newsletter — updates and picks for you`,
    html: buildMarketingEmailHtml({
      title: `${APP_NAME} newsletter`,
      preheader: `Your ${APP_NAME} update: marketplace news, tips, and featured picks.`,
      heroTitle: 'Your Nexlogs update',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                Here is a quick roundup from ${APP_NAME} — what is new, what is popular, and where to go next.
              </p>
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f26522;">Featured</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">
                Visit the marketplace to see trending products and newly listed items. Edit this section with your own highlights before sending.
              </p>
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f26522;">Tip</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">
                Add funds once, then checkout in seconds — no need to re-enter payment details for every order.
              </p>`,
      ctaLabel: 'Open marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'marketing-product-highlight',
    name: 'Product highlight',
    category: 'marketing',
    description: 'Spotlight one product or offer with a clear call to action.',
    defaultSubject: `A pick for you on ${APP_NAME}`,
    html: buildMarketingEmailHtml({
      title: 'Product highlight',
      preheader: `We picked something you might like on ${APP_NAME}. Take a look inside.`,
      heroTitle: 'Recommended for you',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                We wanted to share a product worth a closer look. Replace the placeholder below with your product name, price, and a short description before sending.
              </p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.7;color:#111827;"><strong>[Product name]</strong></p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">[One sentence about why this product is useful]</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;"><strong>[Price]</strong></p>`,
      ctaLabel: 'View product',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'marketing-special-offer',
    name: 'Special offer',
    category: 'marketing',
    description: 'Promote a sale or bundle without spam trigger words.',
    defaultSubject: `Save on selected items at ${APP_NAME}`,
    html: buildMarketingEmailHtml({
      title: 'Special offer',
      preheader: `Selected items on ${APP_NAME} are available at updated prices this week.`,
      heroTitle: 'Selected items on sale',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                For a limited period, selected products on ${APP_NAME} are available at reduced prices. Update the details below with your actual offer before sending.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>This week only</strong></p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.7;color:#111827;"><strong>[Your offer headline]</strong></p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">[Short offer details — e.g. selected marketplace items]</p>`,
      ctaLabel: 'Shop the offer',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'marketing-buy-numbers-sms',
    name: 'Buy Numbers — SMS verification',
    category: 'marketing',
    description: 'Marketing layout with hero banner. Often lands in Gmail Promotions — use the inbox-friendly template for Primary.',
    defaultSubject: `SMS verification is live on ${APP_NAME} — buy a number in minutes`,
    html: buildMarketingEmailHtml({
      title: 'SMS verification is live',
      preheader: `Reserve a phone number on ${APP_NAME} and receive SMS codes for WhatsApp, Facebook, and more.`,
      heroTitle: 'Buy numbers. Get your code.',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                You can now <strong>buy a temporary phone number</strong> on ${APP_NAME} and receive SMS verification codes directly in your account — no extra apps required.
              </p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                Use it for account verification on popular platforms when you need a fresh number in a specific country.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Works with services like</strong></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#374151;">
                WhatsApp, Facebook, Instagram, Google, Telegram, TikTok, Twitter, Snapchat, Discord, Microsoft, Apple, Naver, Tinder, eBay, Viber, and many more.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>How it works</strong></p>
              <ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Sign in and open <strong>Buy Numbers</strong> from the menu</li>
                <li>Choose your <strong>country</strong> and <strong>service</strong> (for example WhatsApp)</li>
                <li>Confirm and pay from your <strong>wallet balance</strong></li>
                <li>Tap <strong>Get SMS Code</strong> when the message arrives</li>
              </ol>
              <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">
                Need wallet funds first? Use <a href="${appUrl}/add-funds" style="color:#f26522;text-decoration:none;">Add Funds</a> in your account menu. Numbers are for legitimate verification only.
              </p>`,
      ctaLabel: 'Buy a number now',
      ctaUrl: `${appUrl}/buy-numbers`,
    }),
  },
  {
    id: 'account-buy-numbers-services',
    name: 'Buy Numbers — Service 1 & 2 (inbox-friendly)',
    category: 'account',
    description:
      'Plain account notice for SMS verification with Service 1 (SMS Pool) and Service 2 (5sim). Best for Primary inbox.',
    defaultSubject: `Number verification on ${APP_NAME} — Service 1 and Service 2`,
    html: buildInboxFriendlyEmailHtml({
      title: 'Number verification update',
      preheader: `You now have two SMS verification options on ${APP_NAME} — Service 1 and Service 2.`,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                We updated <strong>Buy Numbers</strong> on ${APP_NAME}. You can now choose between two verification services when you need a temporary phone number and SMS code.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Service 1</strong></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">
                Our original SMS Pool option. Pick a country and service, pay from your wallet, then tap <strong>Get SMS Code</strong> when the message arrives.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Service 2</strong></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">
                A second provider with more countries and operators — useful for WhatsApp, Telegram, Google, Facebook, and other apps when Service 1 has no stock.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>How to use it</strong></p>
              <ol style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Sign in and open <strong>Buy Numbers</strong></li>
                <li>Select <strong>Service 1</strong> or <strong>Service 2</strong></li>
                <li>Choose country and app (for example WhatsApp)</li>
                <li>Pay from your wallet and wait for the code on the page</li>
              </ol>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">
                If one service has no numbers for your country, try the other. Add wallet funds first if your balance is low.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
                Thank you,<br/>
                <strong style="color:#111827;">The ${APP_NAME} team</strong>
              </p>`,
      linkLabel: 'Open Buy Numbers',
      linkUrl: `${appUrl}/buy-numbers`,
    }),
  },
  {
    id: 'account-buy-numbers-announcement',
    name: 'Buy Numbers launch (inbox-friendly)',
    category: 'account',
    description: 'Plain account-style notice — best choice for Primary inbox (not Promotions).',
    defaultSubject: `You can now use Buy Numbers on ${APP_NAME}`,
    html: buildInboxFriendlyEmailHtml({
      title: 'Buy Numbers on Nexlogs',
      preheader: `A quick note about SMS verification on ${APP_NAME} — WhatsApp, Facebook, and other services.`,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                We added <strong>Buy Numbers</strong> to your ${APP_NAME} account. You can reserve a phone number and receive SMS verification codes on the website when you need to verify an account.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                It works with WhatsApp, Facebook, Instagram, Google, Telegram, TikTok, and many other services. Choose a country, pick the service, pay from your wallet, then open <strong>Get SMS Code</strong> when the message arrives.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                If your wallet balance is low, add funds first from your account menu. Numbers are for legitimate verification only.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
                Thank you,<br/>
                <strong style="color:#111827;">The ${APP_NAME} team</strong>
              </p>`,
      linkLabel: 'Open Buy Numbers',
      linkUrl: `${appUrl}/buy-numbers`,
    }),
  },
  {
    id: 'marketing-reengagement',
    name: 'We miss you',
    category: 'marketing',
    description: 'Gentle re-engagement email for inactive contacts.',
    defaultSubject: `Still shopping on ${APP_NAME}?`,
    html: buildMarketingEmailHtml({
      title: 'We miss you',
      preheader: `It has been a while — see what is new on ${APP_NAME}.`,
      heroTitle: 'We would love to see you back',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                It has been a while since your last visit. Our marketplace has grown since then — new products, smoother checkout, and the same support team if you need help.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">
                Sign in anytime to browse, add funds, or pick up where you left off.
              </p>`,
      ctaLabel: 'Return to marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'marketing-minimal-cta',
    name: 'Minimal CTA',
    category: 'marketing',
    description: 'Short marketing email with one message and button.',
    defaultSubject: `Quick note from ${APP_NAME}`,
    html: buildMarketingEmailHtml({
      title: 'Quick note',
      preheader: `A short update from ${APP_NAME} — open to read more.`,
      heroTitle: 'A quick note from us',
      compactLogo: true,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.7;">
                [Write your marketing message here — keep it clear, helpful, and focused on one action.]
              </p>`,
      ctaLabel: 'Learn more',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'welcome-message',
    name: 'Welcome message',
    category: 'account',
    description: 'Onboarding email for new registered users.',
    defaultSubject: `Welcome to ${APP_NAME}`,
    html: buildPlainEmailHtml({
      title: 'Welcome message',
      preheader: `Welcome to ${APP_NAME}. Sign in to browse the marketplace and manage your orders.`,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                Thank you for creating an account on <strong>${APP_NAME}</strong>. Your profile is set up and you can sign in at any time.
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">A few things you can do from your account:</p>
              <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Browse products on the marketplace</li>
                <li>Add funds to your account balance</li>
                <li>View your order history</li>
              </ul>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>How to add funds</strong></p>
              <ol style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Sign in to your account at ${siteHost}</li>
                <li>Open <a href="${appUrl}/add-funds" style="color:#111827;text-decoration:underline;">Add Funds</a> from your account menu</li>
                <li>Enter an amount and follow the steps to complete payment</li>
              </ol>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>How to purchase a product</strong></p>
              <ol style="margin:0;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Visit the <a href="${appUrl}/marketplace" style="color:#111827;text-decoration:underline;">marketplace</a> and choose a product</li>
                <li>Open the product page and select the option you need</li>
                <li>Confirm your order — payment is taken from your account balance</li>
                <li>Find your order details under <a href="${appUrl}/purchases" style="color:#111827;text-decoration:underline;">My Purchases</a></li>
              </ol>
              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">You received this because you registered at ${siteHost}.</p>`,
      linkLabel: 'Go to marketplace',
      linkUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'wallet-manual-credit-notice',
    name: 'Wallet credit notice',
    category: 'account',
    description:
      'Notify a user their wallet was credited (₦7,000) after a delayed deposit. Includes fix notice for add-funds.',
    defaultSubject: `Your ${APP_NAME} wallet has been updated — ₦7,000 added`,
    html: buildMarketingEmailHtml({
      title: 'Wallet updated',
      preheader: `₦7,000 has been added to your ${APP_NAME} wallet. The add-funds issue is fixed.`,
      heroTitle: 'Your wallet has been updated',
      compactLogo: true,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                Your wallet balance on <strong>${APP_NAME}</strong> has been updated. We are sorry your payment
                did not show in your account right away — that was our mistake, not yours.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Amount added:</strong> ₦7,000</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#111827;"><strong>Status:</strong> Funds added to your wallet</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                We have also fixed the issue that caused your payment not to appear. You can now add funds
                through your account without running into the same problem.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                You can sign in and use your balance to purchase products on the marketplace whenever you are ready.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#6b7280;">
                If anything still looks wrong in your account, reply to this email and we will help.
              </p>`,
      ctaLabel: 'Browse marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'service-restored',
    name: 'Service restored',
    category: 'account',
    description:
      'Notify users that maintenance is complete. Includes add-funds, marketplace links, and Telegram support.',
    defaultSubject: `${APP_NAME} service restored — you can add funds and shop again`,
    html: buildPlainEmailHtml({
      title: 'Service restored',
      preheader: `${APP_NAME} service restored. You can now add funds, purchase, and reach support on Telegram.`,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hello {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                The scheduled work on <strong>${APP_NAME}</strong> has been completed. All systems are now operational.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>What you can do now</strong></p>
              <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li><strong>Add funds</strong> to your wallet in Naira (NGN)</li>
                <li><strong>Browse the marketplace</strong> and place orders</li>
                <li>Access your <strong>order history</strong> and purchase details</li>
              </ul>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#374151;">Everything is back to normal. Thank you for your patience.</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#111827;"><strong>Support</strong></p>
              <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li><strong>Telegram:</strong> <a href="${telegramSupportUrl}" style="color:#111827;text-decoration:underline;">@nexlogs</a></li>
                <li><strong>Support page:</strong> <a href="${appUrl}/support" style="color:#111827;text-decoration:underline;">${siteHost}/support</a></li>
                <li><strong>Email:</strong> <a href="mailto:support@nexlogs.store" style="color:#111827;text-decoration:underline;">support@nexlogs.store</a></li>
              </ul>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#111827;">Thank you for being part of ${APP_NAME}.</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">This notification is sent to registered users of ${siteHost}. If you have feedback, reply to this email.</p>`,
      linkLabel: 'Open marketplace',
      linkUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'website-navigation-guide',
    name: 'Website navigation guide',
    category: 'account',
    description: 'Step-by-step guide to menus, marketplace, wallet, and support.',
    defaultSubject: `How to navigate ${APP_NAME}`,
    html: buildMarketingEmailHtml({
      title: `Navigate ${APP_NAME}`,
      preheader: `A quick tour of ${APP_NAME} — marketplace, wallet, purchases, and help.`,
      heroTitle: 'How to navigate our website',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
                Here is a simple guide to finding your way around <strong>${APP_NAME}</strong>. Sign in at
                <a href="${appUrl}/login" style="color:#f26522;text-decoration:none;">${siteHost}/login</a>
                to access everything below.
              </p>
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">1. Main menu (top left ☰)</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#374151;">
                Tap the menu icon to open the side panel. From there you can go to Marketplace, Purchase RDP, My Purchases, Buy Numbers, and Need help?.
              </p>
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">2. Top navigation links</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#374151;">
                Use the header links for quick access to <a href="${appUrl}/" style="color:#111827;text-decoration:underline;">Home</a>,
                <a href="${appUrl}/marketplace" style="color:#111827;text-decoration:underline;">Marketplace</a>,
                <a href="${appUrl}/about" style="color:#111827;text-decoration:underline;">About</a>, and
                <a href="${appUrl}/support" style="color:#111827;text-decoration:underline;">Support</a>.
              </p>
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">3. Your account menu (top right)</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#374151;">
                Click your profile icon to see your wallet balance, open
                <a href="${appUrl}/profile" style="color:#111827;text-decoration:underline;">Profile</a>,
                go to <a href="${appUrl}/add-funds" style="color:#111827;text-decoration:underline;">Add Funds</a>, or sign out.
              </p>
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">4. Buy a product (quick steps)</p>
              <ol style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.9;color:#374151;">
                <li>Add money via <a href="${appUrl}/add-funds" style="color:#111827;text-decoration:underline;">Add Funds</a></li>
                <li>Open the <a href="${appUrl}/marketplace" style="color:#111827;text-decoration:underline;">Marketplace</a> and pick a product</li>
                <li>Confirm your order — payment comes from your wallet balance</li>
                <li>Check delivery under <a href="${appUrl}/purchases" style="color:#111827;text-decoration:underline;">My Purchases</a></li>
              </ol>
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">5. Help &amp; footer links</p>
              <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
                Visit <a href="${appUrl}/faq" style="color:#111827;text-decoration:underline;">FAQ</a> for common questions,
                <a href="${appUrl}/support" style="color:#111827;text-decoration:underline;">Support</a> for help, or email
                <a href="mailto:support@nexlogs.store" style="color:#111827;text-decoration:underline;">support@nexlogs.store</a>.
              </p>`,
      ctaLabel: 'Open marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'blank',
    name: 'Blank HTML',
    category: 'general',
    description: 'Start from scratch with logo and greeting only.',
    html: buildPlainEmailHtml({
      title: 'Email',
      preheader: `A plain email from ${APP_NAME}.`,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Write your message here.</p>`,
    }),
  },
  {
    id: 'announcement',
    name: 'Simple announcement',
    category: 'general',
    description: 'General update with hero banner.',
    defaultSubject: `Update from ${APP_NAME}`,
    html: buildMarketingEmailHtml({
      title: 'Announcement',
      preheader: `An update from ${APP_NAME} for you.`,
      heroTitle: 'Important update',
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.7;">We have an update for you on ${APP_NAME}. Add your announcement text here.</p>`,
    }),
  },
  {
    id: 'promo',
    name: 'Promo with CTA',
    category: 'general',
    description: 'Simple promo layout with marketplace button.',
    defaultSubject: `See what is new on ${APP_NAME}`,
    html: buildMarketingEmailHtml({
      title: 'Promo',
      preheader: `Browse the latest on ${APP_NAME} today.`,
      compactLogo: true,
      bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 8px;font-size:16px;line-height:1.7;">Check out what is new on our marketplace today.</p>`,
      ctaLabel: 'Visit marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
];

export const DEFAULT_HTML_CAMPAIGN_SUBJECT = `Update from ${APP_NAME}`;

export const WELCOME_CAMPAIGN_SUBJECT = `Welcome to ${APP_NAME}`;

export function getHtmlCampaignTemplate(id: string) {
  return HTML_CAMPAIGN_TEMPLATES.find((template) => template.id === id);
}

export function getHtmlCampaignTemplatesByCategory(category: HtmlCampaignTemplateCategory) {
  return HTML_CAMPAIGN_TEMPLATES.filter((template) => template.category === category);
}

export const MARKETING_HTML_CAMPAIGN_TEMPLATES = getHtmlCampaignTemplatesByCategory('marketing');
