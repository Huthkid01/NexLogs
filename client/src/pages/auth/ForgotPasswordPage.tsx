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
import { maskEmailAddress } from '@/lib/auth-errors';

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    if (loading || sent) return;

    setLoading(true);
    const email = data.email.trim();

    try {
      await authService.resetPassword(email);
    } catch {
      // Supabase may still deliver the email when the browser sees a timeout,
      // rate-limit, or duplicate-click error — never scare users with "could not send".
    } finally {
      setSentEmail(email);
      setSent(true);
      setLoading(false);
      toast.success('Check your inbox and spam folder', {
        description: `If an account exists for ${maskEmailAddress(email)}, a reset link was sent. It can take a minute to arrive.`,
      });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {sent
              ? `If an account exists for ${maskEmailAddress(sentEmail)}, check Inbox and Spam for the reset link.`
              : 'Enter your email to receive a reset link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" error={errors.email?.message} {...register('email')} />
              </div>
              <Button type="submit" className="w-full" loading={loading} disabled={loading}>
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Didn’t see it? Wait a minute, check Spam/Junk, then try again once.
              </p>
              <Button className="w-full" asChild>
                <Link to="/login">Back to Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
