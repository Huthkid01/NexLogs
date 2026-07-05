import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

function InlineNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        The page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d94e0f]"
      >
        Back to home
      </Link>
    </div>
  );
}

export function RouterErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <InlineNotFound />;
  }

  const message =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.statusText || 'Something went wrong'
        : 'Something went wrong';

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 shadow-sm dark:border-red-500/20 dark:bg-[#1f0808]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-700 dark:text-red-300">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          We hit an unexpected error
        </h1>
        <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
          Please try again. If the problem continues, contact support.
        </p>
        {import.meta.env.DEV && message ? (
          <p className="mt-4 rounded-lg bg-white/80 px-3 py-2 text-left text-xs text-gray-500 dark:bg-black/20">
            {message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="rounded-lg bg-[#f26522] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#d94e0f]"
          >
            Back to home
          </Link>
          <Link
            to="/support"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dm-input-border dark:text-gray-200 dark:hover:bg-dm-surface"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
