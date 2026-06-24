import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { authService } from '@/services/auth.service';
import { APP_NAME } from '@/constants';
import { getUserSignUpMessage, normalizeAuthErrorMessage } from '@/lib/auth-errors';
import { openErrorReport } from '@/lib/error-report';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await authService.signUp(data.email, data.password, data.name);
      toast.success('Account created! Check your email to verify your account.');
      navigate('/login');
    } catch (err: unknown) {
      const message = getUserSignUpMessage(normalizeAuthErrorMessage(err));
      toast.error(message);
      openErrorReport({
        title: 'Error while creating account',
        message: 'We could not create your account.',
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
      const message = err instanceof Error ? err.message : 'Google signup failed';
      toast.error('We could not create your account with Google.');
      openErrorReport({
        title: 'Error while creating account',
        message: 'We could not create your account with Google.',
        source: 'login',
        errorMessage: message,
      });
    }
  };

  return (
    <AuthPageLayout title="Create account" description={`Join ${APP_NAME} today`}>
      <div className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" error={errors.name?.message} {...register('name')} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" error={errors.email?.message} {...register('email')} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" error={errors.password?.message} {...register('password')} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            </div>
            <Button type="submit" className="w-full" loading={loading}>Create Account</Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground lg:bg-white lg:dark:bg-dm-bg">or continue with</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>Google</Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
      </div>
    </AuthPageLayout>
  );
}
