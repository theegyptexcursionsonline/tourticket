'use client';

import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from 'next-intl';

export default function ForgotPasswordClient() {
  const t = useTranslations('forgotPage');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setSuccessMessage('');
    
    if (!email || !validateEmail(email)) {
      setError(t('errors.invalidEmail'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t('errors.unexpected'));

      setIsSuccess(true);
      setSuccessMessage(result.message || t('success.emailSent'));
      setEmail('');

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t('errors.unexpected'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setSuccessMessage('');
    setError('');
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#E9ECEE] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            {t('success.title')}
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {successMessage}
          </p>

          <div className="space-y-4">
            <Link 
              href="/login"
              className="block w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors text-center flex items-center justify-center"
            >
              {t('backToLogin')}
            </Link>
             <button
              onClick={handleTryAgain}
              className="w-full h-12 bg-slate-100 text-slate-700 rounded-md font-semibold hover:bg-slate-200 transition-colors"
            >
              {t('success.sendAnother')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E9ECEE] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
        <div className="mb-8">
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            <span>{t('backToLogin')}</span>
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-center text-slate-500 text-sm">
            {t('subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

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
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors border-slate-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('emailPlaceholder')}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin mr-2" />
                {t('sending')}
              </>
            ) : (
              t('sendReset')
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
