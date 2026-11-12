import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, User, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { authService } from '@/services/auth.service';
import { completeGoogleAuth } from '@/lib/google-sign-in';
import { APP_NAME } from '@/constants';
import { isGoogleSignInConfigured } from '@/lib/google-auth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { getSignUpVerificationToast, getUserSignUpMessage, normalizeAuthErrorMessage } from '@/lib/auth-errors';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type RegisterForm = z.infer<typeof registerSchema>;

const SIGNUP_TOAST_DURATION_MS = 15_000;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authService.signUp(data.email, data.password, data.name);
      const notice = getSignUpVerificationToast(data.email);
      toast.success(notice.title, {
        description: notice.description,
        duration: SIGNUP_TOAST_DURATION_MS,
      });
      navigate('/login');
    } catch (err: unknown) {
      const rawMessage = normalizeAuthErrorMessage(err);
      const message = getUserSignUpMessage(rawMessage);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const completeGoogleSignIn = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await completeGoogleAuth(idToken);
    } catch (_err: unknown) {
      setGoogleLoading(false);
      toast.error('We could not create your account with Google.');
    }
  };

  return (
    <AuthPageLayout title="Create account" description={`Join ${APP_NAME} today`}>
      <div className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="name"
                autoComplete="name"
                placeholder="Enter your full name"
                className="h-12 pl-10"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>
          </div>
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
                autoComplete="email"
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
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="h-12 pl-10"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="h-12 pl-10"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>
          </div>
          <Button type="submit" className="h-12 w-full gap-2" loading={loading}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Create Account
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
              toast.error('Google sign-up could not be completed. Please try again or use the registration form.');
            }}
          />
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Google sign-in not configured
          </Button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#f26522] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}
