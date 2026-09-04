'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { customerAuthMessage } from '@/lib/auth/providerStatus';
import {
  platformLogin,
  platformLogout,
  platformSession,
  platformSignup,
  type PlatformUser,
} from '@/lib/auth/platformAuth';
import { PLATFORM_SESSION_SENTINEL } from '@/lib/auth/customerSessionToken';

// --- Interfaces ---
interface User {
  id: string;
  _id?: string; // MongoDB ID compatibility
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture?: string;
  photoURL?: string;
  role?: string;
  permissions?: string[];
  authProvider?: 'jwt';
  emailVerified?: boolean;
  createdAt?: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionError: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// --- Context Creation ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Auth Provider Component ---
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // --- Adopt a session established against the platform's own credentials ---
  // This is the only kind of session the storefront issues. No external
  // identity provider is consulted at any point in the customer journey.
  const adoptPlatformSession = (platformUser: PlatformUser, sessionToken?: string) => {
    const first = platformUser.firstName || '';
    const last = platformUser.lastName || '';
    const normalizedUser: User = {
      id: platformUser.id || platformUser._id || '',
      _id: platformUser._id || platformUser.id || '',
      email: platformUser.email,
      name: platformUser.name || `${first} ${last}`.trim(),
      firstName: first,
      lastName: last,
      role: platformUser.role || 'customer',
      permissions: platformUser.permissions || [],
      authProvider: 'jwt',
      emailVerified: Boolean(platformUser.emailVerified),
    };
    setUser(normalizedUser);
    // The session itself lives in an httpOnly cookie. This value only drives
    // `isAuthenticated` in the client; it is never the authority for access.
    setToken(sessionToken || PLATFORM_SESSION_SENTINEL);
  };

  // --- Restore an existing platform session ---
  useEffect(() => {
    const shouldInitializeAuthForPath = () => {
      if (typeof window === 'undefined') return false;
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile) return true;

      const path = pathname || '';
      return [
        '/login',
        '/signup',
        '/forgot',
        '/checkout',
        '/booking',
        '/user',
      ].some((segment) => path.includes(segment));
    };

    if (!shouldInitializeAuthForPath()) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setIsLoading(true));

    void (async () => {
      try {
        const existing = await platformSession();
        if (cancelled) return;
        setSessionError(null);
        if (existing) {
          adoptPlatformSession(existing);
        } else {
          setUser(null);
          setToken(null);
        }
      } catch {
        if (!cancelled) {
          setSessionError('We could not check your session. Please try again in a few minutes.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // --- Refresh user data ---
  const refreshUser = async () => {
    if (!user) return;
    try {
      const existing = await platformSession();
      setSessionError(null);
      if (existing) adoptPlatformSession(existing, token || undefined);
    } catch (error) {
      setSessionError('We could not refresh your account. Please try again in a few minutes.');
      throw error;
    }
  };

  // --- Login with Email/Password ---
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await platformLogin(email, password);
      if (result.ok && result.user) {
        setSessionError(null);
        adoptPlatformSession(result.user, result.token);
        return;
      }
      // Our own route's 4xx copy is already customer-safe.
      if (result.status >= 400 && result.status < 500 && result.error) {
        throw new Error(result.error);
      }
      if (result.status === 401) {
        throw new Error(customerAuthMessage('credential', 'login'));
      }
      throw new Error(customerAuthMessage('provider_unavailable', 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signup with Email/Password ---
  const signup = async (data: SignupData): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await platformSignup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      if (result.ok && result.user) {
        setSessionError(null);
        // The route sets the session cookie, so creating the account also
        // signs the customer in — straight on to checkout.
        adoptPlatformSession(result.user, result.token);
        return;
      }
      if (result.status >= 400 && result.status < 500 && result.error) {
        throw new Error(result.error);
      }
      throw new Error(customerAuthMessage('provider_unavailable', 'signup'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logout Function ---
  const logout = async () => {
    // Clearing the platform session is the whole of sign-out now.
    await platformLogout();

    setUser(null);
    setToken(null);
    setSessionError(null);
    router.push('/login');
  };

  // --- Context Value ---
  const value: AuthContextType = {
    user,
    token,
    isLoading,
    sessionError,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
