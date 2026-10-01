'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AccessDenied from '@/components/admin/AccessDenied';
import type { AdminPageDenial } from '@/lib/auth/adminPageDenial';

interface AdminPageAccessStateProps {
  denial: AdminPageDenial;
  requiredPermissions?: string[];
}

/**
 * What a server-rendered admin page shows instead of its data when the server
 * refused the request. It never receives private data, so rendering it to an
 * anonymous request leaks nothing.
 */
export default function AdminPageAccessState({
  denial,
  requiredPermissions,
}: AdminPageAccessStateProps) {
  if (denial === 'forbidden') {
    return <AccessDenied requiredPermissions={requiredPermissions} />;
  }
  if (denial === 'unavailable') {
    return (
      <AdminRetryPanel
        title="We couldn't confirm your access"
        message="The admin service did not answer in time. Please try again in a moment."
      />
    );
  }
  return <AdminSessionCheck />;
}

/** A signed-in admin's page whose own data could not be read. */
export function AdminLoadFailed({ what }: { what: string }) {
  return (
    <AdminRetryPanel
      title={`We couldn't load the ${what}`}
      message="Nothing was changed. Please try again in a moment."
    />
  );
}

/**
 * The server rendered this page without a valid admin session. Anonymous
 * visitors never see this: the admin layout shows the sign-in form instead.
 * Once the browser holds a session (the admin just signed in, or the server
 * saw an expired one), ask the server to render the page again with it.
 */
export function AdminSessionCheck() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshUser } = useAdminAuth();
  const [isRefreshing, startRefresh] = useTransition();
  const [unresolved, setUnresolved] = useState(false);
  const refreshRequested = useRef(false);
  // Set only once a render has shown the refresh as pending, so the "refresh
  // finished" check can never fire in the same effect pass that started it.
  const refreshObserved = useRef(false);
  const sessionRechecked = useRef(false);

  useEffect(() => {
    if (refreshRequested.current || isLoading || !isAuthenticated) return;
    refreshRequested.current = true;
    const browserPath = window.location.pathname.replace(/\/+$/, '');
    if (browserPath === '/sign-in' || browserPath === '/admin/sign-in') {
      // Opened the sign-in address itself while signed in: go to the dashboard.
      router.replace(browserPath.startsWith('/admin') ? '/admin' : '/');
      return;
    }
    startRefresh(() => router.refresh());
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isRefreshing) {
      refreshObserved.current = true;
      return;
    }
    if (!refreshObserved.current || sessionRechecked.current || !isAuthenticated) return;
    // Still here after the server rendered the page again: it does not accept
    // the session this browser believes it has. Re-check it with the API —
    // an expired or revoked session clears and the sign-in form appears.
    sessionRechecked.current = true;
    void refreshUser().finally(() => setUnresolved(true));
  }, [isRefreshing, isAuthenticated, refreshUser]);

  if (unresolved) {
    return (
      <AdminRetryPanel
        title="This page could not be opened"
        message="Your session could not be confirmed for this page. Reload to try again, or sign out and sign in again."
        reload
      />
    );
  }

  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-600">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span className="font-medium">Checking your session…</span>
    </div>
  );
}

function AdminRetryPanel({
  title,
  message,
  reload = false,
}: {
  title: string;
  message: string;
  reload?: boolean;
}) {
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  const retry = () => {
    if (reload) {
      window.location.reload();
      return;
    }
    startRetry(() => router.refresh());
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        role="alert"
        className="max-w-lg rounded-2xl border border-amber-100 bg-white px-8 py-10 text-center shadow-lg shadow-amber-50"
      >
        <h2 className="mb-3 text-2xl font-semibold text-slate-900">{title}</h2>
        <p className="text-slate-600">{message}</p>
        <button
          type="button"
          onClick={retry}
          disabled={isRetrying}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRetrying ? 'Trying again…' : reload ? 'Reload' : 'Try again'}
        </button>
      </div>
    </div>
  );
}
