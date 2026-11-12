import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, LogIn, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { authService } from '@/services/auth.service';
import { resetThemeForLogin } from '@/contexts/theme';
import { resetDisplayCurrencyForLogin } from '@/contexts/display-currency';
import { completeGoogleAuth } from '@/lib/google-sign-in';
import { APP_NAME } from '@/constants';
import { getSupabaseConfigError } from '@/lib/mock-mode';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { isGoogleSignInConfigured } from '@/lib/google-auth';
import { getUserLoginMessage, normalizeAuthErrorMessage } from '@/lib/auth-errors';
import { consumeAuthRedirect, getPostLoginPath, storeAuthRedirect } from '@/lib/auth-redirect';
import { consumeSessionExpiredNotice, SESSION_EXPIRED_MESSAGE } from '@/lib/session-expired';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginLocationState = {
  from?: { pathname?: string; search?: string };
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { commitSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  useEffect(() => {
    const state = location.state as LoginLocationState | null;
    const from = state?.from;
    if (from) {
      storeAuthRedirect(getPostLoginPath(from, '/marketplace'));
    }

    if (consumeSessionExpiredNotice()) {
      toast.message(SESSION_EXPIRED_MESSAGE);
    }
  }, [location.state]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await authService.signIn(data.email, data.password);
      resetThemeForLogin();
      resetDisplayCurrencyForLogin();
      if (result.session) {
        await commitSession(result.session);
      }
      const redirect = consumeAuthRedirect(
        getPostLoginPath((location.state as LoginLocationState)?.from, '/marketplace'),
      );
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      const message = normalizeAuthErrorMessage(err);
      toast.error(getUserLoginMessage(message));
    } finally {
      setLoading(false);
    }
  };

  const completeGoogleSignIn = async (idToken: string) => {
    const configError = getSupabaseConfigError();
    if (configError) {
      toast.error('Sign in is temporarily unavailable. Please try again later or contact support.');
      return;
    }

    setGoogleLoading(true);
    try {
      await completeGoogleAuth(idToken);
    } catch (err: unknown) {
      setGoogleLoading(false);
      const message = normalizeAuthErrorMessage(err);
      if (message.includes('origin_mismatch') || message.includes('Origin')) {
        toast.error('Google sign-in is temporarily unavailable. Please use your email and password.');
        return;
      }
      toast.error('We could not sign you in with Google.');
    }
  };

  return (
    <AuthPageLayout title="Welcome back" description={`Sign in to your ${APP_NAME} account`}>
      <div className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="Enter your email"
                className="h-12 pl-10"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-12 pl-10"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-[#f26522] focus:ring-[#f26522]"
                {...register('rememberMe')}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-[#f26522] hover:text-[#d94e0f] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="h-12 w-full gap-2" loading={loading}>
            <LogIn className="h-4 w-4" aria-hidden />
            Sign In
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-muted-foreground dark:bg-dm-surface">or continue with</span>
          </div>
        </div>

        {isGoogleSignInConfigured() ? (
          <GoogleSignInButton
            disabled={loading}
            processing={googleLoading}
            onCredential={completeGoogleSignIn}
            onError={(error) => {
              if (error.message === 'Google sign-in was cancelled') return;
              toast.error('Google sign-in could not be completed. Please try again or use your email and password.');
            }}
          />
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Google sign-in not configured
          </Button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-[#f26522] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
