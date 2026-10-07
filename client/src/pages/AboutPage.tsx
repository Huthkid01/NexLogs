import { Link } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { useSiteContent } from '@/hooks/useSiteContent';
import { SEO_PAGES } from '@/lib/seo';

export default function AboutPage() {
  const { content } = useSiteContent();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <SeoHead
        title={SEO_PAGES.about.title}
        description={SEO_PAGES.about.description}
        path={SEO_PAGES.about.path}
      />

      <h1 className="text-3xl font-bold mb-6">{content.about.title}</h1>
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        {content.about.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium">
        <Link to="/buy-numbers" className="text-[#f26522] hover:underline">
          SMS verification numbers
        </Link>
        <Link to="/purchase-rdp" className="text-[#f26522] hover:underline">
          RDP plans
        </Link>
        <Link to="/faq" className="text-[#f26522] hover:underline">
          FAQ
        </Link>
        <Link to="/support" className="text-[#f26522] hover:underline">
          Support
        </Link>
      </div>
    </div>
  );
}
