import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { APP_NAME } from '@/constants';
import { processMarketingUnsubscribe } from '@/services/marketing-unsubscribe.service';

type Status = 'loading' | 'success' | 'error';

export default function UnsubscribePage() {
  const { token: routeToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = (routeToken || searchParams.get('token') || '').trim();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [emailHint, setEmailHint] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This unsubscribe link is invalid.');
      return;
    }

    let cancelled = false;

    void processMarketingUnsubscribe(token)
      .then((result) => {
        if (cancelled) return;
        setStatus('success');
        setEmailHint(result.email ?? '');
        setMessage(
          result.message ?? 'You have been unsubscribed from promotional emails.',
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not process your unsubscribe request.');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-full bg-gray-50 px-4 py-14 dark:bg-dm-bg sm:px-6">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm dark:border-dm-border dark:bg-dm-surface sm:px-8">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#f26522]" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Processing your request…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Unsubscribed</h1>
            {emailHint && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Promotional emails stopped for <strong>{emailHint}</strong>.
              </p>
            )}
            <p className="mt-4 text-sm leading-7 text-gray-700 dark:text-gray-300">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <MailX className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Unable to unsubscribe</h1>
            <p className="mt-4 text-sm leading-7 text-gray-700 dark:text-gray-300">{message}</p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              You can also email{' '}
              <a href="mailto:support@nexlogs.store" className="font-medium text-[#f26522] hover:text-[#d94e0f]">
                support@nexlogs.store
              </a>{' '}
              to opt out of promotional messages.
            </p>
          </>
        )}

        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d94e0f]"
        >
          Back to {APP_NAME}
        </Link>
      </div>
    </div>
  );
}
