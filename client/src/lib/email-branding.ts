import { APP_NAME, APP_URL } from '@/constants';

export const EMAIL_LOGO_PATH = '/images/nexlogs-logo.svg';
export const EMAIL_ICON_PATH = '/images/nexlogs-icon.svg';

export function getEmailLogoUrl(appUrl = APP_URL.replace(/\/$/, '')) {
  return `${appUrl.replace(/\/$/, '')}${EMAIL_LOGO_PATH}`;
}

export function getEmailIconUrl(appUrl = APP_URL.replace(/\/$/, '')) {
  return `${appUrl.replace(/\/$/, '')}${EMAIL_ICON_PATH}`;
}

/** Centered logo row for email templates (Hostinger-style header). */
export function buildEmailLogoHeader(
  appUrl: string,
  appName: string = APP_NAME,
  options?: { width?: number; background?: string; padding?: string; linkUrl?: string },
) {
  const base = appUrl.replace(/\/$/, '');
  const logoUrl = getEmailLogoUrl(base);
  const width = options?.width ?? 168;
  const background = options?.background ?? '#ffffff';
  const padding = options?.padding ?? '28px 32px 20px';
  const linkUrl = options?.linkUrl ?? base;

  return `<tr>
    <td align="center" style="padding:${padding};background:${background};">
      <a href="${linkUrl}" style="text-decoration:none;">
        <img src="${logoUrl}" alt="${appName}" width="${width}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;margin:0 auto;" />
      </a>
    </td>
  </tr>`;
}

/** Orange hero row below the logo. */
export function buildEmailHeroRow(title: string) {
  return `<tr>
    <td style="background:#f26522;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">${title}</h1>
    </td>
  </tr>`;
}

export function htmlContainsEmailLogo(html: string) {
  return html.includes(EMAIL_LOGO_PATH) || html.includes(EMAIL_ICON_PATH);
}

export function prependEmailLogoIfMissing(html: string, appUrl: string, appName: string = APP_NAME) {
  if (htmlContainsEmailLogo(html)) return html;

  const logoBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
  ${buildEmailLogoHeader(appUrl, appName)}
</table>`;

  if (html.includes('<body')) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${logoBlock}`);
  }

  return `${logoBlock}${html}`;
}
