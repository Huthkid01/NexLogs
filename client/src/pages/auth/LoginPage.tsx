import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { APP_NAME } from '@/constants';
import { isMockMode, DEMO_LOGIN, DEMO_ADMIN_LOGIN } from '@/lib/mock-mode';
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
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await authService.signIn(data.email, data.password);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error('We could not sign you in.');
      openErrorReport({
        title: 'Error while signing in',
        message: 'We could not sign you in.',
        source: 'login',
        errorMessage: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google login failed';
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:py-14">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your {APP_NAME} account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMockMode() && (
            <div className="rounded-lg border border-[#fde0cc] bg-[#fff3eb] p-3 text-sm space-y-2">
              <p className="font-semibold text-[#f26522]">Demo mode — use these credentials</p>
              <div className="text-gray-700 space-y-1">
                <p><span className="font-medium">User:</span> {DEMO_LOGIN.email} / {DEMO_LOGIN.password}</p>
                <p><span className="font-medium">Admin:</span> {DEMO_ADMIN_LOGIN.email} / {DEMO_ADMIN_LOGIN.password}</p>
              </div>
            </div>
          )}
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
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or continue with</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
