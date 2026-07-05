import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LazyMenuWalletWalkthrough } from '@/components/onboarding/LazyMenuWalletWalkthrough';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  const { content } = useSiteContent();

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">{content.faq.title}</h1>

      <LazyMenuWalletWalkthrough />

      <div className="space-y-3">
        {content.faq.items.map((faq, i) => (
          <Card key={`${faq.question}-${i}`}>
            <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(open === i ? null : i)}>
              <span className="font-medium pr-4">{faq.question}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <CardContent className="pt-0 pb-4 text-muted-foreground">{faq.answer}</CardContent>}
          </Card>
        ))}
      </div>
    </div>
  );
}
