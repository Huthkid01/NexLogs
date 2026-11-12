import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BarChart3,
  Building2,
  Lock,
  LogIn,
  Mail,
  Settings2,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { resetThemeForLogin } from '@/contexts/theme';
import { NexLogsLogo } from '@/components/common/NexLogsLogo';
import { getAdminLoginMessage, normalizeAuthErrorMessage } from '@/lib/auth-errors';
import { consumeSessionExpiredNotice, SESSION_EXPIRED_MESSAGE } from '@/lib/session-expired';
import { useScrollLock } from '@/hooks/useScrollLock';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const adminLoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  department: z.string().optional(),
  rememberDevice: z.boolean().optional(),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

type AdminLoginLocationState = {
  from?: { pathname?: string };
};

const adminDepartments = [
  'IT Department',
  'Director',
  'Sales Department',
  'Human Resources',
  'Manager',
  'Warehouse',
  'Accounting',
] as const;

const portalHighlights = [
  { label: 'Orders & Stock', icon: Wallet },
  { label: 'View Analytics', icon: BarChart3 },
  { label: 'Manage Operations', icon: Settings2 },
  { label: 'Control Users', icon: Users },
] as const;

const ADMIN_LOGIN_DESKTOP_IMAGE = '/images/admin/nexlogs-admin-login-desktop.jpg';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, commitSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { rememberDevice: true },
  });

  // Desktop admin login is a fixed viewport shell — never allow page scroll.
  useScrollLock(true);

  useEffect(() => {
    if (consumeSessionExpiredNotice()) {
      toast.message(SESSION_EXPIRED_MESSAGE);
    }
  }, [location.state]);

  if (isAdmin) {
    const from = (location.state as AdminLoginLocationState)?.from?.pathname;
    return <Navigate to={from?.startsWith('/admin') ? from : '/admin'} replace />;
  }

  const onSubmit = async (data: AdminLoginForm) => {
    setLoading(true);
    try {
      const email = data.email.trim();
      const password = data.password;

      const result = await authService.signIn(email, password);
      const userId = result.user?.id ?? result.session?.user?.id;

      if (!userId) {
        throw new Error('ADMIN_ACCOUNT_VERIFICATION_FAILED');
      }

      if (result.session) {
        await commitSession(result.session);
      }

      const profile = await authService.getProfile(userId);

      if (profile?.role !== 'admin') {
        await authService.signOut();
        throw new Error('ADMIN_ACCESS_NOT_GRANTED');
      }

      resetThemeForLogin();
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (err: unknown) {
      const message = normalizeAuthErrorMessage(err);
      toast.error(getAdminLoginMessage(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#eef2f7] text-gray-900 max-lg:min-h-[100dvh] lg:fixed lg:inset-0 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] lg:grid-rows-1 lg:overflow-hidden">
      <section className="relative hidden min-h-0 overflow-hidden lg:block">
        <img
          src={ADMIN_LOGIN_DESKTOP_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#1a120c]/88 via-[#2a160c]/72 to-[#f26522]/45"
          aria-hidden
        />
        <div className="relative z-10 flex h-full min-h-0 flex-col px-10 py-6 xl:px-14">
          <div className="flex shrink-0 items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <NexLogsLogo variant="icon" className="h-9 w-9" />
              <span className="text-sm font-bold uppercase tracking-[0.14em] text-white">
                NexLogs
              </span>
            </div>
            <p className="max-w-[220px] text-right text-sm font-medium leading-snug text-white/90">
              Secure marketplace control. Stronger operations.
            </p>
          </div>

          <div className="mt-auto max-w-xl pb-1">
            <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Administrator Portal
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">
              Manage orders, stock, users and payments — keep Nexlogs running smoothly from one secure dashboard.
            </p>

            <ul className="mt-8 grid grid-cols-4 gap-4">
              {portalHighlights.map(({ label, icon: Icon }) => (
                <li key={label} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/10 text-white backdrop-blur-sm">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-white/90">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 max-lg:min-h-[100dvh] items-center justify-center overflow-y-auto px-4 py-8 sm:px-8 lg:py-4">
        <div className="my-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <NexLogsLogo className="h-10" />
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-5">
            <div className="mb-5 text-center lg:mb-3">
              <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff3eb] text-[#f26522]">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to access the administration dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Admin Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    error={errors.email?.message}
                    className="h-11 border-slate-200 bg-white pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#f26522]"
                    placeholder="Enter your email"
                    {...register('email')}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    className="h-11 border-slate-200 bg-white pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#f26522]"
                    placeholder="Enter your password"
                    {...register('password')}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-department"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Department
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    id="admin-department"
                    className="flex h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-[#f26522]"
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

              <div className="flex items-center justify-between gap-3 pt-0.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#f26522] focus:ring-[#f26522]"
                    {...register('rememberDevice')}
                  />
                  Remember this device
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#f26522] hover:text-[#d94e0f] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'mt-0.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f26522] px-4 text-sm font-semibold text-white transition-colors',
                  'hover:bg-[#d94e0f] disabled:cursor-not-allowed disabled:opacity-70',
                )}
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {loading ? 'Signing in...' : 'Secure Login'}
              </button>
            </form>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Authorized Personnel Only
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#f26522]/15 bg-[#fff7f2] px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f26522]" aria-hidden />
              <p>This is a secured area. Unauthorized access is prohibited.</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-slate-500 hover:text-[#f26522]">
              Back to public website
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
