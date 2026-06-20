import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute, GuestRoute, AdminGuestRoute, AdminRedirectGate } from '@/routes/ProtectedRoute';

import HomePage from '@/pages/HomePage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
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
import AdminExchangeRatesPage from '@/pages/admin/AdminExchangeRatesPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AdminRedirectGate><MainLayout /></AdminRedirectGate>,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'marketplace', element: <ProtectedRoute><HomePage /></ProtectedRoute> },
      { path: 'marketplace/:slug', element: <Navigate to="/marketplace" replace /> },
      { path: 'cart', element: <Navigate to="/marketplace" replace /> },
      { path: 'blog', element: <Navigate to="/" replace /> },
      { path: 'blog/:slug', element: <Navigate to="/" replace /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
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
    ],
  },
  { path: '/admin/login', element: <AdminGuestRoute><AdminLoginPage /></AdminGuestRoute> },
  { path: '/dashboard/*', element: <ProtectedRoute><AdminRedirectGate><Navigate to="/profile" replace /></AdminRedirectGate></ProtectedRoute> },
  {
    path: '/admin',
    element: <ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'products', element: <AdminProductsPage /> },
      { path: 'orders', element: <AdminOrdersPage /> },
      { path: 'categories', element: <AdminCategoriesPage /> },
      { path: 'coupons', element: <AdminCouponsPage /> },
      { path: 'tickets', element: <AdminTicketsPage /> },
      { path: 'activity', element: <AdminActivityLogsPage /> },
      { path: 'slides', element: <AdminSlidesPage /> },
      { path: 'exchange-rates', element: <AdminExchangeRatesPage /> },
      { path: 'blog', element: <Navigate to="/admin" replace /> },
      { path: 'content', element: <Navigate to="/admin/content/homepage" replace /> },
      { path: 'content/:section', element: <AdminContentPage /> },
      { path: 'analytics', element: <AdminAnalyticsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
