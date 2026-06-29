import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute, GuestRoute, AdminGuestRoute, AdminRedirectGate } from '@/routes/ProtectedRoute';

import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import FaqPage from '@/pages/FaqPage';
import SupportPage from '@/pages/SupportPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
import SuspendedPage from '@/pages/SuspendedPage';

import LoginPage from '@/pages/auth/LoginPage';
import AdminLoginPage from '@/pages/auth/AdminLoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';

import ProfilePage from '@/pages/ProfilePage';
import MyPurchasesPage from '@/pages/MyPurchasesPage';
import AddFundsPage from '@/pages/AddFundsPage';
import PurchaseRdpPage from '@/pages/PurchaseRdpPage';
import BuyNumbersPage from '@/pages/BuyNumbersPage';

import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminProductsPage from '@/pages/admin/AdminProductsPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminCouponsPage from '@/pages/admin/AdminCouponsPage';
import AdminTicketsPage from '@/pages/admin/AdminTicketsPage';
import AdminActivityLogsPage from '@/pages/admin/AdminActivityLogsPage';
import AdminContentPage from '@/pages/admin/AdminContentPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminSlidesPage from '@/pages/admin/AdminSlidesPage';
import AdminRdpPage from '@/pages/admin/AdminRdpPage';
import AdminSenderPage from '@/pages/admin/AdminSenderPage';
import AdminTransactionsPage from '@/pages/admin/AdminTransactionsPage';
import UnsubscribePage from '@/pages/UnsubscribePage';
import NotFoundPage from '@/pages/NotFoundPage';
import { RouterErrorPage } from '@/routes/RouterErrorPage';

const router = createBrowserRouter([
  { path: '/unsubscribe/:token', element: <UnsubscribePage />, errorElement: <RouterErrorPage /> },
  { path: '/unsubscribe', element: <UnsubscribePage />, errorElement: <RouterErrorPage /> },
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
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'transactions', element: <AdminTransactionsPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'tickets', element: <AdminTicketsPage /> },
      { path: 'activity', element: <AdminActivityLogsPage /> },
      { path: 'slides', element: <AdminSlidesPage /> },
      { path: 'rdp', element: <AdminRdpPage /> },
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
