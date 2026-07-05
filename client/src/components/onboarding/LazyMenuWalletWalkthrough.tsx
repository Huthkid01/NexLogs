import { lazy, Suspense, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInView } from '@/hooks/useInView';

const MenuWalletWalkthrough = lazy(() =>
  import('@/components/onboarding/MenuWalletWalkthrough').then((module) => ({
    default: module.MenuWalletWalkthrough,
  })),
);

function WalkthroughFallback() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-surface sm:p-6">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="mt-3 h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-full max-w-md" />
      <Skeleton className="mx-auto mt-6 aspect-9/16 w-full max-w-[320px] rounded-[28px]" />
    </div>
  );
}

export function LazyMenuWalletWalkthrough() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef);

  return (
    <div ref={containerRef} className="mb-10 min-h-[420px]">
      {inView ? (
        <Suspense fallback={<WalkthroughFallback />}>
          <MenuWalletWalkthrough active />
        </Suspense>
      ) : (
        <WalkthroughFallback />
      )}
    </div>
  );
}
