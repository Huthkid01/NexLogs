import { useAuth } from '@/contexts/AuthContext';
import { AppLoader } from '@/components/common/AppLoader';
import { SeoHead } from '@/components/seo/SeoHead';
import { ServiceSeoLanding } from '@/components/seo/ServiceSeoLanding';

interface SeoPublicOrProtectedProps {
  children: React.ReactNode;
  landing: {
    title: string;
    headline: string;
    description: string;
    bullets: string[];
  };
  seo: {
    title: string;
    description: string;
    path: string;
  };
}

/**
 * Guests see crawlable SEO content. Signed-in users get the real tool.
 * Does not change purchase/wallet logic.
 */
export function SeoPublicOrProtected({ children, landing, seo }: SeoPublicOrProtectedProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <AppLoader iconClassName="h-9 w-9" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <SeoHead title={seo.title} description={seo.description} path={seo.path} />
        <ServiceSeoLanding
          title={landing.title}
          headline={landing.headline}
          description={landing.description}
          bullets={landing.bullets}
        />
      </>
    );
  }

  return (
    <>
      <SeoHead title={seo.title} description={seo.description} path={seo.path} />
      {children}
    </>
  );
}
