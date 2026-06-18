import { useSiteContent } from '@/hooks/useSiteContent';

export default function AboutPage() {
  const { content } = useSiteContent();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">{content.about.title}</h1>
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        {content.about.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
