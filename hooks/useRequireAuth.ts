'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  useEffect(() => {
    // Wait for the auth context to finish loading
    if (!isLoading) {
      // Only redirect if we're certain the user is not authenticated
      // and the auth context has finished initializing
      if (!isAuthenticated && !user) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return { 
    user, 
    isLoading,
    isAuthenticated: isAuthenticated && !!user 
  };
}
