'use client';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, sessionError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Wait for auth context to finish loading
    if (!isLoading && !sessionError) {
      // Only redirect if we're sure the user is not authenticated
      if (!isAuthenticated && !user) {
        const suffix = `${window.location.search}${window.location.hash}`;
        const returnTo = `${pathname || '/user/dashboard'}${suffix}`;
        router.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname, sessionError]);

  // Show loading while auth context is initializing or during redirect
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div role="alert" className="max-w-md rounded-lg border border-amber-300 bg-amber-50 p-6 text-center text-amber-950">
          <h1 className="text-lg font-semibold">We could not check your session</h1>
          <p className="mt-2 text-sm">Your account data has not been changed. Please try again in a few minutes.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
}
