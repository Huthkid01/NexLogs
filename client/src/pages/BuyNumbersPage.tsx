import { Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function BuyNumbersPage() {
  const { content } = useSiteContent();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 shadow-sm dark:border-dm-border dark:bg-dm-surface sm:px-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4ef] text-[#f26522] dark:bg-[#f26522]/10">
          <Smartphone className="h-7 w-7" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f26522]">Coming soon</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          {content.home.buyNumbersLabel}
        </h1>
        <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">
          Our team are working on it.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/marketplace"
            className="rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d94e0f]"
          >
            Browse marketplace
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dm-input-border dark:text-gray-200 dark:hover:bg-dm-product-row-hover"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
