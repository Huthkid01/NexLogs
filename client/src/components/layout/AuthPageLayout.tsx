import type { ReactNode } from 'react';
import { KeyRound, Monitor, MessageSquare, Users } from 'lucide-react';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';

const AUTH_DESKTOP_IMAGE = '/images/auth/nexlogs-user-auth-desktop.jpg';

const authHighlights = [
  { label: 'SMS Numbers', icon: MessageSquare },
  { label: 'Buy RDP', icon: Monitor },
  { label: 'Social Accounts', icon: Users },
  { label: 'Secure Wallet', icon: KeyRound },
] as const;

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

/** Mobile: centered card. Desktop (lg+): locked viewport split, no page scroll. */
export function AuthPageLayout({ children, title, description }: AuthPageLayoutProps) {
  return (
    <div className="w-full max-lg:min-h-0 lg:grid lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:overflow-hidden">
      <section className="relative hidden overflow-hidden lg:block lg:h-full lg:min-h-0">
        <img
          src={AUTH_DESKTOP_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#1a120c]/88 via-[#2a160c]/68 to-[#f26522]/42"
          aria-hidden
        />
        <div className="relative z-10 flex h-full flex-col px-10 py-6 xl:px-14">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <NexLogsLogo variant="icon" className="h-9 w-9" />
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-white">
                NexLogs
              </span>
            </div>
            <p className="max-w-[240px] text-right text-sm font-medium leading-snug text-white/90">
              SMS numbers · RDP · Social accounts
            </p>
          </div>

          <div className="mt-auto max-w-xl pb-2">
            <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Your marketplace account
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">
              Sign in to shop SMS numbers, RDP, and social accounts — with a wallet built for fast checkout.
            </p>

            <ul className="mt-8 grid grid-cols-4 gap-4">
              {authHighlights.map(({ label, icon: Icon }) => (
                <li key={label} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/10 text-white backdrop-blur-sm">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-white/90">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex max-lg:min-h-[calc(100dvh-52px-env(safe-area-inset-top,0px))] items-center justify-center bg-[#eef2f7] px-4 py-10 sm:px-8 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:py-6 dark:bg-dm-bg">
        <div className="my-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <NexLogsLogo className="h-10 sm:h-11" />
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-6 dark:border-dm-border dark:bg-dm-surface">
            <div className="mb-6 text-center lg:mb-4 lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-gray-100">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-gray-400">{description}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
