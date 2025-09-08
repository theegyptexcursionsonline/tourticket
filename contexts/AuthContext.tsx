'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
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
  const { 
    user: auth0User, 
    isLoading, 
    isAuthenticated,
    loginWithRedirect: auth0Login,
    logout: auth0Logout
  } = useAuth0();

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
    auth0Login({
      authorizationParams: {
        redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI
      }
    });
  };

  const logout = () => {
    auth0Logout({
      logoutParams: {
        returnTo: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI
      }
    });
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
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
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI,
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE
      }}
    >
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </Auth0Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};