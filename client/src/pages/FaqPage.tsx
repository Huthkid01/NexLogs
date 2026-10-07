import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LinkifiedText } from '@/components/common/LinkifiedText';
import { LazyMenuWalletWalkthrough } from '@/components/onboarding/LazyMenuWalletWalkthrough';
import { SeoHead } from '@/components/seo/SeoHead';
import { useSiteContent } from '@/hooks/useSiteContent';
import { SEO_PAGES, SEO_SITE_URL } from '@/lib/seo';

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  const { content } = useSiteContent();

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${SEO_SITE_URL}/faq#faq`,
      mainEntity: content.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }),
    [content.faq.items],
  );

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SeoHead
        title={SEO_PAGES.faq.title}
        description={SEO_PAGES.faq.description}
        path={SEO_PAGES.faq.path}
        jsonLd={faqJsonLd}
      />

      <h1 className="text-3xl font-bold mb-8 text-center">{content.faq.title}</h1>

      <LazyMenuWalletWalkthrough />

      <div className="space-y-3">
        {content.faq.items.map((faq, i) => (
          <Card key={`${faq.question}-${i}`}>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span className="font-medium pr-4">{faq.question}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {/* Keep answers in the DOM for crawlers/AEO even when collapsed. */}
            <CardContent
              className={`pt-0 pb-4 text-muted-foreground ${open === i ? 'block' : 'hidden'}`}
            >
              <LinkifiedText text={faq.answer} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
