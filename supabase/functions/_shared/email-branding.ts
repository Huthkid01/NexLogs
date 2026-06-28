const LOGO_FILE = 'images/nexlogs-logo.svg';
const ICON_FILE = 'images/nexlogs-icon.svg';

export function getEmailLogoUrl(appUrl: string) {
  return `${appUrl.replace(/\/$/, '')}/${LOGO_FILE}`;
}

export function getEmailIconUrl(appUrl: string) {
  return `${appUrl.replace(/\/$/, '')}/${ICON_FILE}`;
}

export function buildEmailLogoHeader(
  appUrl: string,
  appName: string,
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

export function buildEmailHeroRow(title: string) {
  return `<tr>
    <td style="background:#f26522;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">${title}</h1>
    </td>
  </tr>`;
}

export function htmlContainsEmailLogo(html: string) {
  return html.includes('nexlogs-logo.svg') || html.includes('nexlogs-icon.svg');
}

/** Prepends centered logo block when custom HTML does not already include it. */
export function prependEmailLogoIfMissing(html: string, appUrl: string, appName: string) {
  if (htmlContainsEmailLogo(html)) return html;

  const logoBlock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;">
  ${buildEmailLogoHeader(appUrl, appName)}
</table>`;

  if (html.includes('<body')) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${logoBlock}`);
  }

  return `${logoBlock}${html}`;
}
