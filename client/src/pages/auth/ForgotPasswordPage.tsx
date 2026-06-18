import { useState } from 'react';
import { Link } from 'react-router-dom';
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

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authService.resetPassword(data.email);
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      toast.error('We could not send the reset email.');
      openErrorReport({
        title: 'Error while sending reset email',
        message: 'We could not send the reset email.',
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
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>{sent ? 'Check your email for a reset link' : 'Enter your email to receive a reset link'}</CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" error={errors.email?.message} {...register('email')} />
              </div>
              <Button type="submit" className="w-full" loading={loading}>Send Reset Link</Button>
            </form>
          ) : (
            <Button className="w-full" asChild><Link to="/login">Back to Login</Link></Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
