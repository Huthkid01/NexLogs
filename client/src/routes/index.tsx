import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute, GuestRoute, AdminGuestRoute, AdminRedirectGate } from '@/routes/ProtectedRoute';
import { lazyPage } from '@/routes/lazyPage';
import { RouterErrorPage } from '@/routes/RouterErrorPage';

const HomePage = lazyPage(() => import('@/pages/HomePage'));
const AboutPage = lazyPage(() => import('@/pages/AboutPage'));
const FaqPage = lazyPage(() => import('@/pages/FaqPage'));
const SupportPage = lazyPage(() => import('@/pages/SupportPage'));
const PrivacyPage = lazyPage(() => import('@/pages/PrivacyPage'));
const RefundPage = lazyPage(() => import('@/pages/RefundPage'));
const TermsPage = lazyPage(() => import('@/pages/TermsPage'));
const SuspendedPage = lazyPage(() => import('@/pages/SuspendedPage'));
const SessionExpiredPage = lazyPage(() => import('@/pages/SessionExpiredPage'));

const LoginPage = lazyPage(() => import('@/pages/auth/LoginPage'));
const AdminLoginPage = lazyPage(() => import('@/pages/auth/AdminLoginPage'));
const RegisterPage = lazyPage(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazyPage(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazyPage(() => import('@/pages/auth/ResetPasswordPage'));
const AuthCallbackPage = lazyPage(() => import('@/pages/auth/AuthCallbackPage'));

const ProfilePage = lazyPage(() => import('@/pages/ProfilePage'));
const MyPurchasesPage = lazyPage(() => import('@/pages/MyPurchasesPage'));
const AddFundsPage = lazyPage(() => import('@/pages/AddFundsPage'));
const PurchaseRdpPage = lazyPage(() => import('@/pages/PurchaseRdpPage'));
const BuyNumbersPage = lazyPage(() => import('@/pages/BuyNumbersPage'));

const AdminDashboardPage = lazyPage(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazyPage(() => import('@/pages/admin/AdminUsersPage'));
const AdminProductsPage = lazyPage(() => import('@/pages/admin/AdminProductsPage'));
const AdminOrdersPage = lazyPage(() => import('@/pages/admin/AdminOrdersPage'));
const AdminCategoriesPage = lazyPage(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminCouponsPage = lazyPage(() => import('@/pages/admin/AdminCouponsPage'));
const AdminTicketsPage = lazyPage(() => import('@/pages/admin/AdminTicketsPage'));
const AdminActivityLogsPage = lazyPage(() => import('@/pages/admin/AdminActivityLogsPage'));
const AdminContentPage = lazyPage(() => import('@/pages/admin/AdminContentPage'));
const AdminAnalyticsPage = lazyPage(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminSlidesPage = lazyPage(() => import('@/pages/admin/AdminSlidesPage'));
const AdminRdpPage = lazyPage(() => import('@/pages/admin/AdminRdpPage'));
const AdminSenderPage = lazyPage(() => import('@/pages/admin/AdminSenderPage'));
const AdminTransactionsPage = lazyPage(() => import('@/pages/admin/AdminTransactionsPage'));
const AdminSmsPricingPage = lazyPage(() => import('@/pages/admin/AdminSmsPricingPage'));
const AdminLoggsplugPage = lazyPage(() => import('@/pages/admin/AdminLoggsplugPage'));
const AdminMaintenancePage = lazyPage(() => import('@/pages/admin/AdminMaintenancePage'));
const AdminReviewsPage = lazyPage(() => import('@/pages/admin/AdminReviewsPage'));
const UnsubscribePage = lazyPage(() => import('@/pages/UnsubscribePage'));
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'));

const router = createBrowserRouter([
  { path: '/unsubscribe/:token', element: <UnsubscribePage />, errorElement: <RouterErrorPage /> },
  { path: '/unsubscribe', element: <UnsubscribePage />, errorElement: <RouterErrorPage /> },
  { path: '/session-expired', element: <SessionExpiredPage />, errorElement: <RouterErrorPage /> },
  {
    path: '/',
    element: <AdminRedirectGate><MainLayout /></AdminRedirectGate>,
    errorElement: <RouterErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'marketplace', element: <ProtectedRoute><HomePage /></ProtectedRoute> },
      { path: 'marketplace/:slug', element: <Navigate to="/marketplace" replace /> },
      { path: 'cart', element: <Navigate to="/marketplace" replace /> },
      { path: 'blog', element: <Navigate to="/" replace /> },
      { path: 'blog/:slug', element: <Navigate to="/" replace /> },
      { path: 'contact', element: <Navigate to="/support" replace /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'faq', element: <FaqPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'refund', element: <RefundPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'suspended', element: <SuspendedPage /> },
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      { path: 'register', element: <GuestRoute><RegisterPage /></GuestRoute> },
      { path: 'forgot-password', element: <GuestRoute><ForgotPasswordPage /></GuestRoute> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: 'profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      { path: 'purchases', element: <ProtectedRoute><MyPurchasesPage /></ProtectedRoute> },
      { path: 'add-funds', element: <ProtectedRoute><AddFundsPage /></ProtectedRoute> },
      { path: 'purchase-rdp', element: <ProtectedRoute><PurchaseRdpPage /></ProtectedRoute> },
      { path: 'buy-numbers', element: <ProtectedRoute><BuyNumbersPage /></ProtectedRoute> },
      { path: 'buy-numbers/:providerId', element: <ProtectedRoute><BuyNumbersPage /></ProtectedRoute> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/login', element: <AdminGuestRoute><AdminLoginPage /></AdminGuestRoute>, errorElement: <RouterErrorPage /> },
  { path: '/dashboard/*', element: <ProtectedRoute><AdminRedirectGate><Navigate to="/profile" replace /></AdminRedirectGate></ProtectedRoute> },
  {
    path: '/admin',
    element: <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>,
    errorElement: <RouterErrorPage />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'products/loggsplug', element: <AdminProductsPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'reviews', element: <AdminReviewsPage /> },
      { path: 'transactions', element: <AdminTransactionsPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'tickets', element: <AdminTicketsPage /> },
      { path: 'activity', element: <AdminActivityLogsPage /> },
      { path: 'slides', element: <AdminSlidesPage /> },
      { path: 'rdp', element: <AdminRdpPage /> },
      { path: 'supplier/loggsplug', element: <AdminLoggsplugPage /> },
      { path: 'maintenance', element: <AdminMaintenancePage /> },
      { path: 'sms-pricing', element: <Navigate to="/admin/sms-pricing/smspool" replace /> },
      { path: 'sms-pricing/:provider', element: <AdminSmsPricingPage /> },
      { path: 'sender', element: <AdminSenderPage /> },
      { path: 'content', element: <Navigate to="/admin/content/homepage" replace /> },
      { path: 'content/contact', element: <Navigate to="/admin/content/support" replace /> },
      { path: 'content/:section', element: <AdminContentPage /> },
      { path: 'analytics', element: <AdminAnalyticsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '*',
    element: (
      <AdminRedirectGate>
        <MainLayout />
      </AdminRedirectGate>
    ),
    errorElement: <RouterErrorPage />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
