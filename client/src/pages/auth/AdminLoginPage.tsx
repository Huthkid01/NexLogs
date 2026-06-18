import { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { APP_NAME } from '@/constants';
import { getAdminLoginMessage, isExpectedUserAuthError, normalizeAuthErrorMessage } from '@/lib/auth-errors';
import { Input } from '@/components/ui/input';
import { openErrorReport } from '@/lib/error-report';
import { DEMO_ADMIN_LOGIN, isMockMode } from '@/lib/mock-mode';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  department: z.string().optional(),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

const adminDepartments = [
  'IT Department',
  'Director',
  'Sales Department',
  'Human Resources',
  'Manager',
  'Warehouse',
  'Accounting',
] as const;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const mockMode = isMockMode();
  const adminEmail = mockMode ? DEMO_ADMIN_LOGIN.email : (import.meta.env.VITE_ADMIN_EMAIL as string | undefined);
  const adminPassword = mockMode ? DEMO_ADMIN_LOGIN.password : (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined);
  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: mockMode ? { email: DEMO_ADMIN_LOGIN.email, password: DEMO_ADMIN_LOGIN.password } : undefined,
  });

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (data: AdminLoginForm) => {
    setLoading(true);
    try {
      if (!adminEmail?.trim() || !adminPassword?.trim()) {
        throw new Error('ADMIN_LOGIN_NOT_READY');
      }

      if (data.email.trim().toLowerCase() !== adminEmail.trim().toLowerCase() || data.password !== adminPassword) {
        throw new Error('INVALID_ADMIN_CREDENTIALS');
      }

      const result = await authService.signIn(adminEmail, adminPassword);
      const userId = result.user?.id ?? result.session?.user?.id;

      if (!userId) {
        throw new Error('ADMIN_ACCOUNT_VERIFICATION_FAILED');
      }

      const profile = await authService.getProfile(userId);

      if (profile?.role !== 'admin') {
        await authService.signOut();
        throw new Error('ADMIN_ACCESS_NOT_GRANTED');
      }

      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (err: unknown) {
      const message = normalizeAuthErrorMessage(err);
      toast.error(getAdminLoginMessage(message));

      if (!isExpectedUserAuthError(message)) {
        openErrorReport({
          title: 'Error while signing in',
          message: 'We could not sign you in to the admin dashboard.',
          source: 'login',
          errorMessage: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7f2_0%,#f8f9fa_45%,#eef2f7_100%)] text-gray-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#fde0cc] bg-white shadow-lg">
            <Shield className="h-8 w-8 text-[#f26522]" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{APP_NAME.toUpperCase()}</h1>
          <p className="mt-2 text-sm text-gray-500">Admin Dashboard Access</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fff3eb] px-4 py-2 text-xs font-semibold text-[#c44d10]">
              <Shield className="h-3.5 w-3.5 text-[#f26522]" />
              Secure Admin Access
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <Input
                id="admin-email"
                type="email"
                error={errors.email?.message}
                className="h-12 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#f26522]"
                placeholder="admin@example.com"
                {...register('email')}
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="admin-password"
                  type="password"
                  error={errors.password?.message}
                  className="h-12 border-gray-200 bg-white pl-10 text-gray-900 placeholder:text-gray-400 focus-visible:ring-[#f26522]"
                  placeholder="Enter your password"
                  {...register('password')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-department" className="mb-2 block text-sm font-medium text-gray-700">
                Department
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  id="admin-department"
                  className="flex h-12 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-[#f26522]"
                  defaultValue=""
                  {...register('department')}
                >
                  <option value="">Select your department</option>
                  {adminDepartments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#f26522] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#d94e0f] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-500 space-y-2">
            <p>Authorized personnel only. All access is monitored and logged.</p>
            <p>
              Support:{' '}
              <a href="mailto:support@nexlogs.com" className="text-[#f26522] hover:text-[#d94e0f] hover:underline">
                support@nexlogs.com
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-[#f26522]">
            Back to public website
          </Link>
        </div>
      </div>
    </div>
  );
}
