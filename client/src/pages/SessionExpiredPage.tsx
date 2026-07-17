import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import {
  peekSessionExpiredLoginPath,
  SESSION_EXPIRED_MESSAGE,
} from '@/lib/session-expired';

const AUTO_REDIRECT_SECONDS = 8;

export default function SessionExpiredPage() {
  const loginPath = useMemo(() => peekSessionExpiredLoginPath(), []);
  const isAdminLogin = loginPath.startsWith('/admin');
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.location.assign(loginPath);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loginPath]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f7f4f0] via-[#faf8f6] to-[#efe8e0] px-4 py-12 dark:from-[#11151b] dark:via-[#151a22] dark:to-[#0f1318]">
      <div className="w-full max-w-md rounded-2xl border border-amber-200/80 bg-white/95 px-6 py-8 text-center shadow-lg dark:border-amber-500/20 dark:bg-dm-surface/95">
        <div className="mx-auto mb-5 flex justify-center">
          <NexLogsLogo className="h-10 w-auto" />
        </div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Clock3 className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
          Session expired
        </p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Please sign in again
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
          {SESSION_EXPIRED_MESSAGE}
          {isAdminLogin
            ? ' You will be taken to the admin login.'
            : ' You will be taken to the login page.'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to={loginPath}
            replace
            className="rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d94e0f]"
          >
            Home
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Redirecting automatically in {secondsLeft}s…
          </p>
        </div>
      </div>
    </div>
  );
}
