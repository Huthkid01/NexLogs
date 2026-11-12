import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { AppLoader } from '@/components/common/AppLoader';
import { tryReloadForChunkLoadError } from '@/lib/error-boundary-recovery';

function importPage(importFn: () => Promise<{ default: ComponentType }>) {
  return importFn().catch((error: unknown) => {
    // Stale chunk after deploy — hard reload once onto the new build.
    if (tryReloadForChunkLoadError(error)) {
      return new Promise<{ default: ComponentType }>(() => undefined);
    }
    throw error;
  });
}

export function lazyPage(importFn: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(() => importPage(importFn));

  return function LazyPage() {
    return (
      <Suspense fallback={<AppLoader />}>
        <Page />
      </Suspense>
    );
  };
}

export function withSuspense(node: ReactNode, fallback: ReactNode = <AppLoader />) {
  return <Suspense fallback={fallback}>{node}</Suspense>;
}
