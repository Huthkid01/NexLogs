import type { ReactNode } from 'react';

const AUTH_HERO_IMAGE = '/images/auth/nexlogs-auth-hero.png';

interface AuthPageLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

/** Mobile: centered card. Desktop (lg+): split form left, circular hero image right. */
export function AuthPageLayout({ children, title, description }: AuthPageLayoutProps) {
  return (
    <div className="w-full lg:grid lg:min-h-[calc(100dvh-52px)] lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-h-[80vh] w-full items-center justify-center px-4 py-12 sm:py-14 lg:min-h-[calc(100dvh-52px)] lg:justify-start lg:bg-white lg:px-16 lg:py-10 dark:lg:bg-dm-bg xl:px-24">
        <div className="w-full max-w-md lg:max-w-[400px]">
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm lg:border-0 lg:bg-transparent lg:shadow-none">
            <div className="flex flex-col space-y-1.5 p-6 text-center lg:p-0 lg:text-left">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="space-y-4 p-6 pt-0 lg:p-0 lg:pt-8">{children}</div>
          </div>
        </div>
      </div>

      <div className="hidden min-h-[calc(100dvh-52px)] items-center justify-center bg-white p-6 lg:flex dark:bg-dm-bg xl:p-10">
        <div className="aspect-square w-full max-w-[min(100%,min(85dvh,720px))] overflow-hidden rounded-full border border-border/60 bg-white shadow-lg">
          <img
            src={AUTH_HERO_IMAGE}
            alt="NexLogs — social media platforms"
            className="h-full w-full object-contain object-center p-3"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}
