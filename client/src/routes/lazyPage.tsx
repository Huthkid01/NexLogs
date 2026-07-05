import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { AppLoader } from '@/components/common/AppLoader';

export function lazyPage(importFn: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(importFn);

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
