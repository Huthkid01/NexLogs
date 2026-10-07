import { Link } from 'react-router-dom';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';

interface ServiceSeoLandingProps {
  title: string;
  headline: string;
  description: string;
  bullets: string[];
  primaryCtaTo?: string;
  primaryCtaLabel?: string;
}

/** Public crawlable marketing page shown to guests on commercial routes. */
export function ServiceSeoLanding({
  title,
  headline,
  description,
  bullets,
  primaryCtaTo = '/register',
  primaryCtaLabel = 'Create free account',
}: ServiceSeoLandingProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex justify-center">
        <NexLogsLogo className="h-9" />
      </div>

      <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#f26522]">
        {title}
      </p>
      <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
        {headline}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-gray-600 dark:text-gray-300">
        {description}
      </p>

      <ul className="mx-auto mt-8 max-w-xl space-y-3 text-sm text-gray-700 dark:text-gray-200">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26522]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to={primaryCtaTo} className="btn-orange px-8 py-2.5 text-sm text-center min-w-[160px]">
          {primaryCtaLabel}
        </Link>
        <Link
          to="/login"
          className="rounded-md border border-gray-300 px-8 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-dm-input-border dark:text-gray-100 dark:hover:bg-dm-input min-w-[160px] text-center"
        >
          Sign in
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Learn more on our{' '}
        <Link to="/about" className="font-medium text-[#f26522] hover:underline">
          About
        </Link>
        ,{' '}
        <Link to="/faq" className="font-medium text-[#f26522] hover:underline">
          FAQ
        </Link>
        , and{' '}
        <Link to="/support" className="font-medium text-[#f26522] hover:underline">
          Support
        </Link>{' '}
        pages.
      </p>
    </div>
  );
}
