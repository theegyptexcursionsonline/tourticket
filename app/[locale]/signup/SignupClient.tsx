'use client';

import React, { useState } from 'react';
import { Mail, Lock, User } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';

const SignupClient: React.FC = () => {
  const t = useTranslations('signupPage');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup, sessionError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error(t('errors.passwordMin'));
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({ firstName, lastName, email, password });
      toast.success(t('toasts.signupSuccess'));
      router.push('/'); // Redirect on success
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('toasts.signupFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-center text-slate-500 mb-8">
            {t('alreadyHaveAccount')}
            <Link href="/login" className="text-blue-600 hover:underline ml-1">
              {t('logIn')}
            </Link>
          </p>

          {sessionError && (
            <p role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {sessionError}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First + Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('firstNameLabel')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={t('firstNamePlaceholder')}
                    className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                  {t('lastNameLabel')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={t('lastNamePlaceholder')}
                    className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={t('emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={t('passwordPlaceholder')}
                  className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">{t('passwordHint')}</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('creatingAccount')}
                </>
              ) : (
                t('signUp')
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
};

export default SignupClient;
