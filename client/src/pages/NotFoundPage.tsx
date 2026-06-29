import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-7xl font-bold text-[#f26522]/20 dark:text-[#f26522]/30">404</p>
      <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm dark:border-dm-border dark:bg-dm-surface">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f26522]">
          Page not found
        </p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          We could not find that page
        </h1>
        <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
          The link may be broken, outdated, or the page may have been moved. Check the URL or go
          back to a page you know works.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d94e0f]"
          >
            <Home className="h-4 w-4" />
            Back to home
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dm-input-border dark:text-gray-200 dark:hover:bg-dm-bg"
          >
            <Search className="h-4 w-4" />
            Browse marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
