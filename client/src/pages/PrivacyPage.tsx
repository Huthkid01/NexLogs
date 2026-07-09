import { useSiteContent } from '@/hooks/useSiteContent';
import { LinkifiedText } from '@/components/common/LinkifiedText';

export default function PrivacyPage() {
  const { content } = useSiteContent();

  return (
    <div className="bg-[#f8f9fa] dark:bg-dm-bg/60 py-10 sm:py-14">
      <div className="page-content">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white dark:bg-dm-surface shadow-sm border border-gray-200 dark:border-dm-border px-6 py-8 sm:px-8 sm:py-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              {content.privacy.title}
            </h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {content.privacy.lastUpdatedLabel} {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-8">
            {content.privacy.sections.map((section, index) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {section.title}
                </h2>
                <p className="text-sm sm:text-base leading-7 text-gray-700 dark:text-gray-300">
                  <LinkifiedText text={section.body} />
                  {index === content.privacy.sections.length - 1 && (
                    <a
                      href={`mailto:${content.privacy.contactEmail}`}
                      className="text-[#f26522] hover:text-[#d94e0f] font-medium"
                    >
                      {' '}
                      {content.privacy.contactEmail}
                    </a>
                  )}
                  {index === content.privacy.sections.length - 1 && '.'}
                </p>

                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>
                        <LinkifiedText text={bullet} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
