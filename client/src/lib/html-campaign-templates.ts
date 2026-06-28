import { APP_NAME, APP_URL } from '@/constants';
import { buildEmailHeroRow, buildEmailLogoHeader } from '@/lib/email-branding';

export interface HtmlCampaignTemplate {
  id: string;
  name: string;
  html: string;
}

const appUrl = APP_URL.replace(/\/$/, '');
const emailLogoHeader = buildEmailLogoHeader(appUrl, APP_NAME);
const emailLogoHeaderCompact = buildEmailLogoHeader(appUrl, APP_NAME, {
  padding: '24px 32px 8px',
});

export const HTML_CAMPAIGN_TEMPLATES: HtmlCampaignTemplate[] = [
  {
    id: 'blank',
    name: 'Blank HTML',
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
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Announcement</title>
</head>
<body style="margin:0;padding:32px 16px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          ${emailLogoHeader}
          ${buildEmailHeroRow('Important update')}
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hi {{name}},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">We have an update for you on ${APP_NAME}. Add your announcement text here.</p>
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
    id: 'welcome-message',
    name: 'Welcome message',
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
                      <li>Sign in to your account at ${appUrl.replace('https://', '')}</li>
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
                You received this because you registered at ${appUrl.replace('https://', '')}.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
                <a href="${appUrl}/marketplace" style="color:#f26522;text-decoration:none;">${appUrl.replace('https://', '')}</a>
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
    id: 'promo',
    name: 'Promo with CTA',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Promo</title>
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
              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">Check out what is new on our marketplace today.</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#f26522;">
                    <a href="${appUrl}/marketplace" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Visit marketplace</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
];

export const DEFAULT_HTML_CAMPAIGN_SUBJECT = `Update from ${APP_NAME}`;

export const WELCOME_CAMPAIGN_SUBJECT = `Welcome to ${APP_NAME}`;
