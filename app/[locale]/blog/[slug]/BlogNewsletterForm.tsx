'use client';

import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

type Outcome = 'idle' | 'pending' | 'confirmed';

/**
 * The newsletter request in the article side panel. It posts to the same route
 * as the footer form (/api/subscribe, double opt-in) with the consent of the reader.
 * Success is shown only when the route accepts the request: a refusal, a saved
 * request whose confirmation could not be sent, or a network failure each tell
 * the reader what happened, in the page language. The messages of the route are
 * English, so the answer is chosen from its status rather than echoed.
 */
export function BlogNewsletterForm() {
  const t = useTranslations('blog.newsletter');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('idle');
  // State updates land after the event returns, so a second click in the same
  // tick would still see `submitting === false`. The ref closes that gap.
  const inFlight = useRef(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!email.trim()) {
      setError(t('invalidEmail'));
      return;
    }
    if (!consent) {
      setError(t('consentRequired'));
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'blog', consent: true }),
      });
      const data = (await response.json().catch(() => ({}))) as { status?: string; saved?: boolean };
      if (response.ok) {
        setOutcome(data.status === 'confirmed' ? 'confirmed' : 'pending');
        setEmail('');
        setConsent(false);
        return;
      }
      if (response.status === 400) setError(t('invalidEmail'));
      else if (response.status === 429) setError(t('tooMany'));
      else if (response.status === 503 && data.saved === true) setError(t('savedNotDelivered'));
      else if (response.status === 503) setError(t('unavailable'));
      else setError(t('failed'));
    } catch {
      setError(t('failed'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (outcome !== 'idle') {
    return (
      <div className="blog-card bg-white rounded-2xl shadow p-6 text-center" role="status" data-testid="blog-newsletter-result">
        <h4 className="font-semibold mb-2">{t(outcome === 'confirmed' ? 'confirmedTitle' : 'pendingTitle')}</h4>
        <p className="text-sm text-slate-600">{t(outcome === 'confirmed' ? 'confirmedBody' : 'pendingBody')}</p>
      </div>
    );
  }

  return (
    <div className="blog-card bg-white rounded-2xl shadow p-6 text-center">
      <h4 className="font-semibold mb-2">{t('title')}</h4>
      <p className="text-sm text-slate-600 mb-3">{t('body')}</p>
      <form onSubmit={handleSubmit} data-testid="blog-newsletter-form">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          aria-label={t('emailPlaceholder')}
          autoComplete="email"
          disabled={submitting}
          className="w-full px-3 py-2 rounded border mb-3 text-sm"
        />
        <label className="mb-3 flex items-start gap-2 text-start text-xs leading-4 text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
          />
          <span>
            {t('consent')}{' '}
            <Link href="/privacy" className="font-semibold underline underline-offset-2">
              {t('privacyPolicy')}
            </Link>
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting || !consent}
          aria-busy={submitting}
          className="w-full px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-start text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
