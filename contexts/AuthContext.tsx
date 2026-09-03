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
  authProvider?: 'firebase' | 'jwt' | 'google';
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
  /** Always null: no federated provider is wired. Retained so consumers keep compiling. */
  firebaseUser: null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  /** False while no federated provider is configured — the UI hides the control rather than offering a dead one. */
  googleSignInAvailable: boolean;
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
    setToken(sessionToken || 'platform-session');
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
        if (existing) {
          adoptPlatformSession(existing);
        } else {
          setUser(null);
          setToken(null);
        }
      } catch {
        // Nothing to restore — the customer is simply signed out.
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
    const existing = await platformSession();
    if (existing) adoptPlatformSession(existing, token || undefined);
  };

  // --- Login with Email/Password ---
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Same-origin preflight applies the platform's durable Mongo abuse
      // limits before the credential check.
      const loginCheck = await fetch('/api/auth/firebase/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!loginCheck.ok) {
        const result = await loginCheck.json().catch(() => ({}));
        throw new Error(result.error || customerAuthMessage('provider_unavailable', 'login'));
      }

      const result = await platformLogin(email, password);
      if (result.ok && result.user) {
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

  // --- Login with Google ---
  const loginWithGoogle = async (): Promise<void> => {
    // No federated provider is configured. The control is hidden rather than
    // offered, and this exists so any remaining caller fails honestly instead
    // of silently doing nothing.
    throw new Error(customerAuthMessage('provider_unavailable', 'google'));
  };

  // --- Logout Function ---
  const logout = async () => {
    // Clearing the platform session is the whole of sign-out now.
    await platformLogout();

    setUser(null);
    setToken(null);
    router.push('/login');
  };

  // --- Context Value ---
  const value: AuthContextType = {
    user,
    firebaseUser: null,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    loginWithGoogle,
    googleSignInAvailable: false,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
