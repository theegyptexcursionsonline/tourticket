'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  _id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role: string;
  permissions: string[];
  isActive?: boolean;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

interface AdminLoginResponse {
  error?: string;
  user?: AdminUser;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);
const COOKIE_SESSION_SENTINEL = 'cookie-session';

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((newUser: AdminUser) => {
    // Non-secret compatibility flag for existing components. The credential
    // itself is only in the httpOnly cookie and is never exposed to JS.
    setToken(COOKIE_SESSION_SENTINEL);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUserWithToken = useCallback(
    async (activeToken?: string) => {
      const authToken = activeToken || token;

      try {
        const response = await fetch('/api/admin/auth/me', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });

        if (!response.ok) {
          clearSession();
          return;
        }

        const data = await response.json();
        if (data?.user) {
          const normalizedUser: AdminUser = {
            ...data.user,
            id: data.user.id || data.user._id,
            permissions: data.user.permissions || [],
          };
          persistSession(normalizedUser);
        }
      } catch (error) {
        console.error('Failed to refresh admin session', error);
      }
    },
    [token, clearSession, persistSession],
  );

  useEffect(() => {
    // Remove credentials persisted by older releases, then restore the session
    // exclusively from the httpOnly cookie.
    localStorage.removeItem('admin-auth-token');
    localStorage.removeItem('admin-user');
    void Promise.resolve().then(() => refreshUserWithToken()).finally(() => setIsLoading(false));
  }, [refreshUserWithToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, username: email, password }),
        });

        let data: AdminLoginResponse = {};
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json() as AdminLoginResponse;
        } else {
          const text = await response.text();
          data = { error: text || 'Server returned non-JSON response' };
        }

        if (!response.ok) {
          throw new Error(data?.error || `Login failed (${response.status})`);
        }

        if (!data.user) {
          throw new Error('Login succeeded without an admin profile');
        }
        const adminId = data.user.id || data.user._id;
        if (!adminId) throw new Error('Admin profile has no identifier');

        const normalizedUser: AdminUser = {
          ...data.user,
          id: adminId,
          permissions: data.user.permissions || [],
        };

        persistSession(normalizedUser);
        toast.success('Welcome back!');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to log in');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST' });
    clearSession();
    toast.success('You have been logged out.');
  }, [clearSession]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!permission) return true;
      if (!user || !user.permissions) return false;
      if (user.role === 'super_admin' || user.role === 'admin') return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!permissions || permissions.length === 0) {
        return true;
      }
      return permissions.some((permission) => hasPermission(permission));
    },
    [hasPermission],
  );

  const contextValue = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser: refreshUserWithToken,
      hasPermission,
      hasAnyPermission,
    }),
    [user, token, isLoading, login, logout, refreshUserWithToken, hasPermission, hasAnyPermission],
  );

  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
