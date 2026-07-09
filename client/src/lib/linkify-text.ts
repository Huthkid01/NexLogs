export type LinkifiedPart =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; label: string };

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+/gi;

function trimTrailingPunctuation(url: string): { href: string; label: string; trailing: string } {
  let href = url;
  let trailing = '';

  while (href.length > 0) {
    const match = href.match(/[.,;:!?)\]]+$/);
    if (!match) break;

    const punct = match[0];
    const openCount = (href.match(/\(/g) || []).length;
    const closeCount = (href.match(/\)/g) || []).length;

    if (punct.includes(')') && closeCount > openCount) {
      href = href.slice(0, -1);
      trailing = `)${trailing.slice(1)}`;
      continue;
    }

    href = href.slice(0, -punct.length);
    trailing = `${punct}${trailing}`;
    break;
  }

  return { href, label: href, trailing };
}

function normalizeHref(url: string): string {
  return url.startsWith('www.') ? `https://${url}` : url;
}

export function linkifyText(text: string): LinkifiedPart[] {
  if (!text) return [{ type: 'text', value: '' }];

  const parts: LinkifiedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }

    const raw = match[0];
    const { href, label, trailing } = trimTrailingPunctuation(raw);
    if (href) {
      parts.push({
        type: 'link',
        href: normalizeHref(href),
        label,
      });
    } else {
      parts.push({ type: 'text', value: raw });
    }

    if (trailing) {
      parts.push({ type: 'text', value: trailing });
    }

    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}
