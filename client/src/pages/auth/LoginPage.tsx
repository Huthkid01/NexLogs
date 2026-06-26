import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { authService } from '@/services/auth.service';
import { resetThemeForLogin } from '@/contexts/theme';
import { completeGoogleAuth } from '@/lib/google-sign-in';
import { APP_NAME } from '@/constants';
import { getSupabaseConfigError } from '@/lib/mock-mode';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { isGoogleSignInConfigured } from '@/lib/google-auth';
import { getUserLoginMessage, isExpectedUserAuthError, normalizeAuthErrorMessage } from '@/lib/auth-errors';
import { openErrorReport } from '@/lib/error-report';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await authService.signIn(data.email, data.password);
      resetThemeForLogin();
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err: unknown) {
      const message = normalizeAuthErrorMessage(err);
      toast.error(getUserLoginMessage(message));

      if (!isExpectedUserAuthError(message)) {
        openErrorReport({
          title: 'Error while signing in',
          message: 'We could not sign you in.',
          source: 'login',
          errorMessage: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const completeGoogleSignIn = async (idToken: string) => {
    const configError = getSupabaseConfigError();
    if (configError) {
      toast.error(configError);
      return;
    }

    setGoogleLoading(true);
    try {
      await completeGoogleAuth(idToken);
    } catch (err: unknown) {
      setGoogleLoading(false);
      const message = normalizeAuthErrorMessage(err);
      if (message.includes('origin_mismatch') || message.includes('Origin')) {
        toast.error('Google origin mismatch. Add this site URL in Google Cloud → Authorized JavaScript origins.');
        return;
      }
      toast.error('We could not sign you in with Google.');
      openErrorReport({
        title: 'Error while signing in',
        message: 'We could not sign you in with Google.',
        source: 'login',
        errorMessage: message,
      });
    }
  };

  return (
    <AuthPageLayout title="Welcome back" description={`Sign in to your ${APP_NAME} account`}>
      <div className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" error={errors.password?.message} {...register('password')} />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('rememberMe')} />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground lg:bg-white lg:dark:bg-dm-bg">or continue with</span></div>
          </div>

          {isGoogleSignInConfigured() ? (
            <GoogleSignInButton
              disabled={loading}
              processing={googleLoading}
              onCredential={completeGoogleSignIn}
              onError={(error) => {
                if (error.message === 'Google sign-in was cancelled') return;
                toast.error(error.message.includes('GOOGLE_SIGNIN_NOT_CONFIGURED')
                  ? 'Add VITE_GOOGLE_CLIENT_ID in Vercel.'
                  : error.message);
              }}
            />
          ) : (
            <Button variant="outline" className="w-full" disabled>
              Google sign-in not configured
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
          </p>
      </div>
    </AuthPageLayout>
  );
}
