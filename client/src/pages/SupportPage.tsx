import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { useSiteContent } from '@/hooks/useSiteContent';
import { normalizeTelegramUrl } from '@/lib/telegram-url';

const SUPPORT_CHANNELS = [
  {
    id: 'telegram',
    title: 'Telegram',
    description: 'Reach us via Telegram',
    href: 'https://t.me/',
    iconBg: 'bg-[#229ED9]',
    icon: Send,
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Send us an email',
    href: 'mailto:support@nexlogs.com',
    iconBg: 'bg-[#f5b800]',
    icon: Mail,
  },
] as const;

export default function SupportPage() {
  const { content } = useSiteContent();

  return (
    <div className="bg-gray-50 dark:bg-dm-bg min-h-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <Link
            to="/privacy"
            className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-[#f26522] text-white text-sm font-semibold hover:bg-[#d94e0f] transition-colors"
          >
            {content.support.refundPolicyButtonLabel}
          </Link>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {content.support.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              {content.support.intro}
            </p>
          </div>

          <div className="space-y-4 text-left">
            {content.support.channels.map((channel, index) => {
              const channelMeta = SUPPORT_CHANNELS[index];
              const Icon = channelMeta?.icon ?? Mail;
              const href =
                channel.title.toLowerCase() === 'telegram'
                  ? normalizeTelegramUrl(channel.href) ?? channel.href
                  : channel.href;
              return (
                <a
                  key={`${channel.title}-${index}`}
                  href={href}
                  target={channel.title.toLowerCase() === 'telegram' ? '_blank' : undefined}
                  rel={channel.title.toLowerCase() === 'telegram' ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-4 p-4 sm:p-5 bg-white dark:bg-dm-surface border border-gray-200 dark:border-dm-border rounded-xl hover:border-[#f26522]/40 transition-colors"
                >
                  <span
                    className={`w-12 h-12 rounded-full ${channelMeta?.iconBg ?? 'bg-[#f5b800]'} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">{channel.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{channel.description}</p>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Video tutorials — hidden until real videos are ready
          <div className="space-y-3 pt-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{content.support.tutorialTitle}</h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {content.support.tutorialIntro}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 text-left">
            {content.support.tutorials.map((tutorial, index) => (
              <div
                key={`${tutorial.title}-${index}`}
                className="bg-white dark:bg-dm-surface border border-gray-200 dark:border-dm-border rounded-xl overflow-hidden shadow-sm"
              >
                <div className="aspect-video bg-black flex items-center justify-center p-4">
                  <p className="text-center text-sm font-bold leading-snug">
                    <span className="text-red-500">How to</span>
                    <span className="text-white"> {tutorial.label.replace(/^How to\s*/i, '')}</span>
                  </p>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{tutorial.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                    {tutorial.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
