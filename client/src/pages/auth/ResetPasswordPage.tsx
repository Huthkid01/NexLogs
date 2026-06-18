import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { openErrorReport } from '@/lib/error-report';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type Form = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      toast.error('Invalid reset link');
    }
  }, []);

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authService.updatePassword(data.password);
      toast.success('Password updated successfully');
      navigate('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error('We could not reset your password.');
      openErrorReport({
        title: 'Error while resetting password',
        message: 'We could not reset your password.',
        source: 'login',
        errorMessage: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" error={errors.password?.message} {...register('password')} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            </div>
            <Button type="submit" className="w-full" loading={loading}>Update Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
