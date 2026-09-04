'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): React.ReactNode => {
  const { isAuthenticated, isLoading, sessionError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If authentication status is no longer loading and the user is not authenticated,
    // redirect them to the login page.
    if (!isLoading && !isAuthenticated && !sessionError) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router, sessionError]);

  // While the authentication status is being checked, display a loading spinner.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md rounded-lg border border-amber-300 bg-amber-50 p-6 text-center text-amber-950">
          <h1 className="text-lg font-semibold">We could not check your session</h1>
          <p className="mt-2 text-sm">Your account data has not been changed. Please try again in a few minutes.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // If the user is authenticated, render the page's content.
  // This check prevents a brief flash of content before the redirect logic runs.
  if (isAuthenticated) {
    return children;
  }

  // If not authenticated and not loading, render nothing while the redirect happens.
  return null;
};

export default ProtectedRoute;
