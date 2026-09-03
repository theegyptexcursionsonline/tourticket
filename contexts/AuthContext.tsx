'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  classifyAuthFailure,
  customerAuthMessage,
  shouldFallBackToPlatform,
} from '@/lib/auth/providerStatus';
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
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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

const getFirebaseErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const loadFirebaseAuth = async () => {
    const [{ auth, googleProvider, isFirebaseClientConfigured }, firebaseAuth] = await Promise.all([
      import('@/lib/firebase/config'),
      import('firebase/auth'),
    ]);

    if (!isFirebaseClientConfigured || !auth || !googleProvider) {
      const configurationError = new Error('Authentication is temporarily unavailable.');
      Object.assign(configurationError, { code: 'auth/configuration-not-found' });
      throw configurationError;
    }

    return {
      auth,
      googleProvider,
      ...firebaseAuth,
    };
  };

  // --- Adopt a session established against the platform's own credentials ---
  // Used when the identity provider is unavailable. The provider-backed
  // listener owns `firebaseUser`; a platform session deliberately leaves it
  // null so the two can never be confused.
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
    setFirebaseUser(null);
    setUser(normalizedUser);
    // The session itself lives in an httpOnly cookie. This value only drives
    // `isAuthenticated` in the client; it is never the authority for access.
    setToken(sessionToken || 'platform-session');
  };

  // --- Sync Firebase user with MongoDB and get user data ---
  const syncUserWithBackend = async (fbUser: FirebaseUser) => {
    try {
      const idToken = await fbUser.getIdToken();

      // Sync with backend to create/update MongoDB user
      const response = await fetch('/api/auth/firebase/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
          providerData: fbUser.providerData,
        }),
      });

      if (response.ok) {
        const { user: mongoUser } = await response.json();
        return { ...mongoUser, photoURL: fbUser.photoURL };
      } else {
        // Get detailed error from response
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to sync user with backend:', {
          status: response.status,
          error: errorData.error || 'Unknown error',
        });
        // Non-critical error - user can still authenticate with Firebase data
        return null;
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
      // Non-critical error - user can still authenticate with Firebase data
      return null;
    }
  };

  // --- Firebase auth state listener ---
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

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    queueMicrotask(() => setIsLoading(true));

    loadFirebaseAuth().then(({ auth, onAuthStateChanged }) => {
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);

          // Get Firebase ID token
          const idToken = await fbUser.getIdToken();
          setToken(idToken);

          // Sync with backend and get MongoDB user data
          const mongoUser = await syncUserWithBackend(fbUser);

          if (mongoUser) {
            // Normalize user data
            const normalizedUser: User = {
              id: mongoUser.id || mongoUser._id || fbUser.uid,
              _id: mongoUser._id || mongoUser.id || fbUser.uid,
              email: fbUser.email || '',
              name: mongoUser.name || fbUser.displayName || `${mongoUser.firstName} ${mongoUser.lastName}`.trim(),
              firstName: mongoUser.firstName || fbUser.displayName?.split(' ')[0] || '',
              lastName: mongoUser.lastName || fbUser.displayName?.split(' ').slice(1).join(' ') || '',
              picture: fbUser.photoURL || mongoUser.photoURL,
              photoURL: fbUser.photoURL || mongoUser.photoURL,
              role: mongoUser.role || 'customer',
              permissions: mongoUser.permissions || [],
              authProvider: mongoUser.authProvider || 'firebase',
              emailVerified: fbUser.emailVerified,
            };

            setUser(normalizedUser);
          } else {
            // If backend sync fails, create minimal user from Firebase data
            const normalizedUser: User = {
              id: fbUser.uid,
              _id: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || '',
              firstName: fbUser.displayName?.split(' ')[0] || '',
              lastName: fbUser.displayName?.split(' ').slice(1).join(' ') || '',
              picture: fbUser.photoURL || undefined,
              photoURL: fbUser.photoURL || undefined,
              emailVerified: fbUser.emailVerified,
            };
            setUser(normalizedUser);
          }
        } else {
          // No provider session. There may still be a platform session from a
          // sign-in taken while the provider was unavailable — without this
          // the customer would appear signed out on every page load.
          const existing = await platformSession();
          if (cancelled) return;
          if (existing) {
            adoptPlatformSession(existing);
          } else {
            setFirebaseUser(null);
            setUser(null);
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setIsLoading(false);
      }
    });
    }).catch(async (error) => {
      if (getFirebaseErrorCode(error) !== 'auth/configuration-not-found') {
        console.error('Failed to initialize auth listener:', classifyAuthFailure(error));
      }
      // The provider could not start at all. Fall back to the platform session
      // so an outage does not sign every customer out.
      try {
        const existing = await platformSession();
        if (!cancelled && existing) adoptPlatformSession(existing);
      } catch {
        // Nothing further to try; the customer is simply signed out.
      }
      if (!cancelled) setIsLoading(false);
    });

    // Cleanup subscription
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [pathname]);

  // --- Refresh user data ---
  const refreshUser = async () => {
    if (!firebaseUser) {
      // A platform session refreshes from its own endpoint. Returning early
      // here would have left profile changes stale for these customers.
      if (user) {
        const existing = await platformSession();
        if (existing) adoptPlatformSession(existing, token || undefined);
      }
      return;
    }

    try {
      // Force token refresh
      const idToken = await firebaseUser.getIdToken(true);
      setToken(idToken);

      // Sync with backend
      const mongoUser = await syncUserWithBackend(firebaseUser);
      if (mongoUser) {
        const normalizedUser: User = {
          id: mongoUser.id || mongoUser._id || firebaseUser.uid,
          _id: mongoUser._id || mongoUser.id || firebaseUser.uid,
          email: firebaseUser.email || '',
          name: mongoUser.name || firebaseUser.displayName || `${mongoUser.firstName} ${mongoUser.lastName}`.trim(),
          firstName: mongoUser.firstName || '',
          lastName: mongoUser.lastName || '',
          picture: firebaseUser.photoURL || mongoUser.photoURL,
          photoURL: firebaseUser.photoURL || mongoUser.photoURL,
          role: mongoUser.role || 'customer',
          permissions: mongoUser.permissions || [],
          authProvider: mongoUser.authProvider || 'firebase',
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(normalizedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // --- Login with Email/Password ---
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Firebase owns password verification, while this same-origin preflight
      // applies the platform's durable Mongo abuse limits before invoking the
      // client SDK. Firebase's provider-side protections remain active too.
      const loginCheck = await fetch('/api/auth/firebase/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!loginCheck.ok) {
        const result = await loginCheck.json().catch(() => ({}));
        throw new Error(result.error || 'Authentication is temporarily unavailable.');
      }
      const { auth, signInWithEmailAndPassword } = await loadFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated by onAuthStateChanged listener
    } catch (error: unknown) {
      const kind = classifyAuthFailure(error);
      // Log the classification, never the provider's text: on 2026-09-03 that
      // text carried the project's API key.
      console.error('Login failed:', kind);

      // Only a provider outage is retried. A rejected credential, a rate limit
      // or a cancelled flow must never be replayed against another store.
      if (shouldFallBackToPlatform(error)) {
        const fallback = await platformLogin(email, password);
        if (fallback.ok && fallback.user) {
          adoptPlatformSession(fallback.user, fallback.token);
          return;
        }
        // 401 here is genuinely ambiguous — either the password is wrong, or
        // this account only exists with the unavailable provider. Say what is
        // true for both without revealing which, so the response cannot be
        // used to enumerate accounts.
        if (fallback.status === 429 && fallback.error) {
          throw new Error(fallback.error);
        }
        throw new Error(customerAuthMessage('provider_unavailable', 'login'));
      }

      throw new Error(customerAuthMessage(kind, 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signup with Email/Password ---
  const signup = async (data: SignupData): Promise<void> => {
    setIsLoading(true);
    try {
      const {
        auth,
        createUserWithEmailAndPassword,
        updateProfile,
      } = await loadFirebaseAuth();
      // Create Firebase user - Firebase handles duplicate email detection
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update Firebase profile with display name
      const displayName = `${data.firstName} ${data.lastName}`.trim();
      await updateProfile(userCredential.user, { displayName });

      // User will be synced with backend by onAuthStateChanged listener
    } catch (error: unknown) {
      const kind = classifyAuthFailure(error);
      console.error('Signup failed:', kind);

      if (shouldFallBackToPlatform(error)) {
        const fallback = await platformSignup({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
        });
        if (fallback.ok && fallback.user) {
          // The route sets the session cookie, so creating the account also
          // signs the customer in — they can go straight to checkout.
          adoptPlatformSession(fallback.user, fallback.token);
          return;
        }
        // 4xx bodies from our own route are already customer-safe copy
        // ("An account with this email already exists…", password rules).
        if (fallback.status >= 400 && fallback.status < 500 && fallback.error) {
          throw new Error(fallback.error);
        }
        throw new Error(customerAuthMessage('provider_unavailable', 'signup'));
      }

      if (kind === 'credential') {
        const code = getFirebaseErrorCode(error);
        if (code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please log in instead.');
        }
        if (code === 'auth/weak-password') {
          throw new Error('Password should be at least 8 characters.');
        }
        if (code === 'auth/invalid-email') {
          throw new Error('Invalid email address.');
        }
      }

      throw new Error(customerAuthMessage(kind, 'signup'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Login with Google ---
  const loginWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { auth, googleProvider, signInWithPopup } = await loadFirebaseAuth();
      await signInWithPopup(auth, googleProvider);
      // User state will be updated by onAuthStateChanged listener
    } catch (error: unknown) {
      const kind = classifyAuthFailure(error);
      console.error('Google sign-in failed:', kind);

      const errorCode = getFirebaseErrorCode(error);
      if (errorCode === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked. Please allow popups and try again.');
      }
      if (errorCode === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email using a different sign-in method.');
      }

      // Google sign-in has no offline equivalent — there is no password to
      // verify locally — so this states the fact and points at the path that
      // still works rather than leaving a dead button.
      throw new Error(customerAuthMessage(kind, 'google'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logout Function ---
  const logout = async () => {
    // Signing out must succeed even when the identity provider is unreachable.
    // Previously a provider outage threw here, leaving a customer unable to
    // end their own session.
    try {
      const { auth, signOut } = await loadFirebaseAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Provider sign-out unavailable:', classifyAuthFailure(error));
    }

    // Always clear the platform session cookie as well; a customer may hold
    // one, the other, or both.
    await platformLogout();

    setUser(null);
    setFirebaseUser(null);
    setToken(null);
    router.push('/login');
  };

  // --- Context Value ---
  const value: AuthContextType = {
    user,
    firebaseUser,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
