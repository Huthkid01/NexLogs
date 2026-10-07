import { useEffect } from 'react';
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  SEO_OG_IMAGE,
  SEO_SITE_NAME,
  absoluteUrl,
  buildPageTitle,
} from '@/lib/seo';

interface SeoHeadProps {
  title?: string;
  description?: string;
  path?: string;
  type?: 'website' | 'article';
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
  noIndex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  const id = 'nexlogs-page-jsonld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Client-side SEO head manager for SPA routes (Google executes JS). */
export function SeoHead({
  title,
  description,
  path = '/',
  type = 'website',
  image = SEO_OG_IMAGE,
  jsonLd = null,
  noIndex = false,
}: SeoHeadProps) {
  useEffect(() => {
    const pageTitle = title ? buildPageTitle(title) : SEO_DEFAULT_TITLE;
    const pageDescription = description || SEO_DEFAULT_DESCRIPTION;
    const pageUrl = absoluteUrl(path);

    document.title = pageTitle;
    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'robots', noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    upsertLink('canonical', pageUrl);

    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:site_name', SEO_SITE_NAME);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', `${SEO_SITE_NAME} digital marketplace`);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);
    upsertMeta('name', 'twitter:image', image);

    if (jsonLd) {
      upsertJsonLd(jsonLd);
    } else {
      document.getElementById('nexlogs-page-jsonld')?.remove();
    }
  }, [title, description, path, type, image, jsonLd, noIndex]);

  return null;
}
