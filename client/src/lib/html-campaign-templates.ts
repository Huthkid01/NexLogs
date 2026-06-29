import { APP_NAME, APP_URL } from '@/constants';
import { buildEmailHeroRow, buildEmailLogoHeader } from '@/lib/email-branding';

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
const emailLogoHeader = buildEmailLogoHeader(appUrl, APP_NAME);
const emailLogoHeaderCompact = buildEmailLogoHeader(appUrl, APP_NAME, {
  padding: '24px 32px 8px',
});

function buildMarketingEmailHtml(options: {
  title: string;
  preheader: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  heroTitle?: string;
  compactLogo?: boolean;
}) {
  const heroTitle = options.heroTitle ?? options.title;
  const logo = options.compactLogo ? emailLogoHeaderCompact : emailLogoHeader;
  const heroPadding = options.compactLogo ? '8px 32px 32px' : '32px';
  const ctaBlock =
    options.ctaLabel && options.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
          <tr>
            <td style="border-radius:8px;background:#f26522;">
              <a href="${options.ctaUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${options.ctaLabel}</a>
            </td>
          </tr>
        </table>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title}</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${options.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
          ${logo}
          ${buildEmailHeroRow(heroTitle)}
          <tr>
            <td style="padding:${heroPadding};">
              ${options.bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background:#fafafa;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                Questions? <a href="mailto:support@nexlogs.store" style="color:#f26522;text-decoration:none;">support@nexlogs.store</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
                <a href="${appUrl}" style="color:#f26522;text-decoration:none;">${siteHost}</a>
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">This week on ${APP_NAME}</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#4b5563;">
                      • New product categories added<br/>
                      • Updated pricing on selected items<br/>
                      • Faster checkout from your wallet balance
                    </p>
                  </td>
                </tr>
              </table>`,
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;border:1px solid #fed7aa;border-radius:12px;background:#fff7f2;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">[Product name]</p>
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#6b7280;">[One sentence about why this product is useful]</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#f26522;">[Price]</p>
                  </td>
                </tr>
              </table>`,
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:#111827;border-radius:12px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fbbf24;">This week only</p>
                    <p style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;">[Your offer headline]</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#d1d5db;">[Short offer details — e.g. selected marketplace items]</p>
                  </td>
                </tr>
              </table>`,
      ctaLabel: 'Shop the offer',
      ctaUrl: `${appUrl}/marketplace`,
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
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${APP_NAME}</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Welcome to ${APP_NAME}. Sign in to browse the marketplace and manage your orders.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          ${emailLogoHeader}
          ${buildEmailHeroRow('Welcome message')}
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
                Thank you for creating an account on <strong>${APP_NAME}</strong>. Your profile is set up and you can sign in at any time.
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#374151;">A few things you can do from your account:</p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.8;color:#374151;">
                <li>Browse products on the marketplace</li>
                <li>Add funds to your account balance</li>
                <li>View your order history</li>
              </ul>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#fff7f2;border:1px solid #fed7aa;border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1f2937;">How to add funds</p>
                    <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">
                      <li>Sign in to your account at ${siteHost}</li>
                      <li>Open <a href="${appUrl}/add-funds" style="color:#f26522;text-decoration:none;">Add Funds</a> from your account menu</li>
                      <li>Enter an amount and follow the steps to complete payment</li>
                    </ol>
                    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1f2937;">How to purchase a product</p>
                    <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">
                      <li>Visit the <a href="${appUrl}/marketplace" style="color:#f26522;text-decoration:none;">marketplace</a> and choose a product</li>
                      <li>Open the product page and select the option you need</li>
                      <li>Confirm your order — payment is taken from your account balance</li>
                      <li>Find your order details under <a href="${appUrl}/purchases" style="color:#f26522;text-decoration:none;">My Purchases</a></li>
                    </ol>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#f26522;">
                    <a href="${appUrl}/marketplace" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Go to marketplace</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
                Questions? Reply to this email and our team will help.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;background:#fafafa;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                You received this because you registered at ${siteHost}.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
                <a href="${appUrl}/marketplace" style="color:#f26522;text-decoration:none;">${siteHost}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#166534;">Amount added</p>
                    <p style="margin:0 0 14px;font-size:28px;font-weight:700;color:#15803d;">₦7,000</p>
                    <p style="margin:0 0 6px;font-size:13px;color:#166534;">Status</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#15803d;">Funds added to your wallet</p>
                  </td>
                </tr>
              </table>
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

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">1. Main menu (top left ☰)</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
                      Tap the menu icon to open the side panel. From there you can go to:<br/>
                      • <strong>Marketplace</strong> — browse all products<br/>
                      • <strong>Purchase RDP</strong> — RDP orders<br/>
                      • <strong>My Purchases</strong> — your order history<br/>
                      • <strong>Buy Numbers</strong> — number products<br/>
                      • <strong>Need help?</strong> — support page
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">2. Top navigation links</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
                      Use the header links for quick access:<br/>
                      • <a href="${appUrl}/" style="color:#f26522;text-decoration:none;">Home</a> — landing page<br/>
                      • <a href="${appUrl}/marketplace" style="color:#f26522;text-decoration:none;">Marketplace</a> — shop catalog<br/>
                      • <a href="${appUrl}/about" style="color:#f26522;text-decoration:none;">About</a> — about ${APP_NAME}<br/>
                      • <a href="${appUrl}/support" style="color:#f26522;text-decoration:none;">Support</a> — contact &amp; help
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">3. Your account menu (top right)</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
                      Click your profile icon to see your wallet balance, open
                      <a href="${appUrl}/profile" style="color:#f26522;text-decoration:none;">Profile</a>,
                      go to <a href="${appUrl}/add-funds" style="color:#f26522;text-decoration:none;">Add Funds</a>,
                      or sign out. Your balance is shown here before you buy.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#fff7f2;border:1px solid #fed7aa;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1f2937;">4. Buy a product (quick steps)</p>
                    <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.9;color:#374151;">
                      <li>Add money via <a href="${appUrl}/add-funds" style="color:#f26522;text-decoration:none;">Add Funds</a></li>
                      <li>Open the <a href="${appUrl}/marketplace" style="color:#f26522;text-decoration:none;">Marketplace</a> and pick a product</li>
                      <li>Confirm your order — payment comes from your wallet balance</li>
                      <li>Check delivery under <a href="${appUrl}/purchases" style="color:#f26522;text-decoration:none;">My Purchases</a></li>
                    </ol>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827;">5. Help &amp; footer links</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;">
                      • <a href="${appUrl}/faq" style="color:#f26522;text-decoration:none;">FAQ</a> — common questions<br/>
                      • <a href="${appUrl}/support" style="color:#f26522;text-decoration:none;">Support</a> — open a ticket or find Telegram<br/>
                      • Footer links for Privacy &amp; Terms at the bottom of every page<br/>
                      • Email us anytime at <a href="mailto:support@nexlogs.store" style="color:#f26522;text-decoration:none;">support@nexlogs.store</a>
                    </p>
                  </td>
                </tr>
              </table>`,
      ctaLabel: 'Open marketplace',
      ctaUrl: `${appUrl}/marketplace`,
    }),
  },
  {
    id: 'blank',
    name: 'Blank HTML',
    category: 'general',
    description: 'Start from scratch with logo and greeting only.',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          ${emailLogoHeaderCompact}
          <tr>
            <td style="padding:8px 32px 32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Write your message here.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
