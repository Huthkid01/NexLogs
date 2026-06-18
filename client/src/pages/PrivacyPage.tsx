import { Link } from 'react-router-dom';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function PrivacyPage() {
  const { content } = useSiteContent();

  return (
    <div className="bg-[#f8f9fa] dark:bg-dm-bg/60 py-10 sm:py-14">
      <div className="page-content">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white dark:bg-dm-surface shadow-sm border border-gray-200 dark:border-dm-border px-6 py-8 sm:px-8 sm:py-10">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              {content.refund.title}
            </h1>
            <p className="text-sm sm:text-base leading-7 text-gray-700 dark:text-gray-300">
              {content.refund.intro}
            </p>
          </div>

          <ul className="mt-8 list-disc pl-5 space-y-4 text-sm sm:text-base leading-7 text-gray-700 dark:text-gray-300">
            {content.refund.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
            <li>
              To request a refund or replacement, please contact our{' '}
              <Link to="/support" className="font-medium text-[#f26522] hover:text-[#d94e0f]">
                {content.refund.supportLinkLabel}
              </Link>
              .
            </li>
          </ul>

          <p className="mt-10 text-sm text-gray-500 dark:text-gray-400">
            {content.refund.updateNote}
          </p>
        </div>
      </div>
    </div>
  );
}
