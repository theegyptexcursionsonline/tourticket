'use client';

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { safeRelativeRedirect } from '@/lib/security/safeRedirect';

export default function LoginClient() {
  const t = useTranslations('loginPage');
  const { user, login, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRelativeRedirect(searchParams.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      router.push(redirectTarget);
    }
  }, [isAuthenticated, user, authLoading, router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('errors.missingCredentials'));
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success(t('toasts.loginSuccess'));

      // Add a small delay to ensure auth state is updated before redirect
      setTimeout(() => {
        router.push(redirectTarget);
      }, 100);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('toasts.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shows a loader while the auth state is being determined or during redirection
  if (authLoading || (isAuthenticated && user)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-center text-slate-500 mb-8">
            {t('noAccount')}{' '}
            <Link href="/signup" className="text-blue-600 hover:underline ml-1">
              {t('signUp')}
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('emailPlaceholder')}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('passwordPlaceholder')}
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="ml-2 text-sm text-slate-600">{t('rememberMe')}</span>
              </label>
              <Link href="/forgot" className="text-sm text-blue-600 hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('signingIn')}
                </>
              ) : (
                t('signIn')
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              {t('legalPrefix')}{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">{t('terms')}</Link>
              {' '}{t('and')}{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">{t('privacy')}</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
