'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { UserProvider, useUser as useAuth0User } from '@auth0/nextjs-auth0/client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithRedirect: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { user: auth0User, isLoading, error } = useAuth0User();

  const user: User | null = auth0User ? {
    id: auth0User.sub || '',
    email: auth0User.email || '',
    name: auth0User.name || '',
    picture: auth0User.picture,
    favorites: [],
    bookings: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } : null;

  const loginWithRedirect = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = () => {
    window.location.href = '/api/auth/logout';
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginWithRedirect,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </UserProvider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};