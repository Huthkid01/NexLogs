import { Link } from 'react-router-dom';

export default function SuspendedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 shadow-sm dark:border-amber-500/20 dark:bg-[#1f1608]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
          Account Suspended
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
          This account is currently restricted
        </h1>
        <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
          Please contact support if you believe this was a mistake or if you need help restoring access.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/support"
            className="rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d94e0f]"
          >
            Contact Support
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dm-input-border dark:text-gray-200 dark:hover:bg-dm-surface"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
