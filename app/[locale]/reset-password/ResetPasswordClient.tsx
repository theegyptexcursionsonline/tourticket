'use client';

import {useEffect, useMemo, useState} from 'react';
import {AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/routing';

const RESET_TOKEN = /^[a-f0-9]{64}$/i;

interface ResetPasswordClientProps {
  token: string;
  email?: string;
  /** Which token store issued this link. Defaults to the mobile backend. */
  endpoint?: string;
}

export default function ResetPasswordClient({
  token,
  email = '',
  endpoint = '/api/mobile-auth/reset-password',
}: ResetPasswordClientProps) {
  const t = useTranslations('resetPasswordPage');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const linkIsValid = useMemo(() => RESET_TOKEN.test(token), [token]);

  useEffect(() => {
    // Keep the one-time capability out of browser history, screenshots and
    // outbound referrers after the page has captured it for this session.
    const stripPrivateQuery = () =>
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname,
      );
    stripPrivateQuery();
    // Next restores its router state once during hydration. Preserve that
    // state, then strip the query again after hydration has settled.
    const settledStrip = window.setTimeout(stripPrivateQuery, 250);
    return () => window.clearTimeout(settledStrip);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!linkIsValid) {
      setError(t('errors.invalidLink'));
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError(t('errors.passwordLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || t('errors.unavailable'));

      setPassword('');
      setConfirmPassword('');
      setComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('errors.unavailable'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff1f2_0,_#f8fafc_45%,_#e2e8f0_100%)] px-4 py-10 sm:py-16">
      <section className="mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 px-7 py-8 text-white sm:px-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            {complete ? <CheckCircle2 aria-hidden="true" size={30} /> : <ShieldCheck aria-hidden="true" size={30} />}
          </div>
          <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-rose-200">{t('eyebrow')}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {complete ? t('success.title') : t('title')}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            {complete
              ? t('success.description')
              : email
                ? t('subtitleWithEmail', {email})
                : t('subtitle')}
          </p>
        </div>

        <div className="p-7 sm:p-10">
          {complete ? (
            <Link
              href="/login"
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200">
              {t('success.signIn')}
            </Link>
          ) : !linkIsValid ? (
            <div className="space-y-5">
              <div role="alert" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={22} />
                <div>
                  <p className="font-semibold">{t('invalid.title')}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">{t('invalid.description')}</p>
                </div>
              </div>
              <Link
                href="/forgot"
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200">
                {t('invalid.requestNew')}
              </Link>
              <Link href="/login" className="block text-center text-sm font-semibold text-slate-600 hover:text-slate-950">
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit} noValidate>
              {error ? (
                <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
                  <span>{error}</span>
                </div>
              ) : null}

              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-slate-800">
                  {t('newPassword')}
                </label>
                <div className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
                  <LockKeyhole aria-hidden="true" className="shrink-0 text-slate-400" size={20} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent py-3 text-base text-slate-950 outline-none"
                    placeholder={t('passwordPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}>
                    {showPassword ? <EyeOff aria-hidden="true" size={20} /> : <Eye aria-hidden="true" size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-slate-800">
                  {t('confirmPassword')}
                </label>
                <div className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
                  <LockKeyhole aria-hidden="true" className="shrink-0 text-slate-400" size={20} />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent py-3 text-base text-slate-950 outline-none"
                    placeholder={t('confirmPlaceholder')}
                    required
                  />
                </div>
              </div>

              <p className="text-xs leading-5 text-slate-500">{t('securityNote')}</p>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <Loader2 aria-hidden="true" className="mr-2 animate-spin" size={20} /> : null}
                {submitting ? t('updating') : t('updatePassword')}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
