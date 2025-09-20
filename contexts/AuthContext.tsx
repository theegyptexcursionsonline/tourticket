'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
interface User {
  id: string;
  _id?: string; // MongoDB ID compatibility
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture?: string;
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
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --- Helper to handle successful authentication ---
  const handleAuthSuccess = (newToken: string, newUser: User) => {
    // Ensure user has both id and _id for compatibility
    const normalizedUser = {
      ...newUser,
      id: newUser.id || newUser._id || '',
      _id: newUser._id || newUser.id || '',
    };

    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
  };

  // --- Effect to check for stored token on initial load ---
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Verify token is still valid by attempting to refresh user data
          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            });

            if (response.ok) {
              const { user: currentUser } = await response.json();
              const normalizedUser = {
                ...currentUser,
                id: currentUser.id || currentUser._id || '',
                _id: currentUser._id || currentUser.id || '',
              };
              handleAuthSuccess(storedToken, normalizedUser);
            } else {
              // Token is invalid, clear storage
              console.log('Token validation failed, clearing storage');
              localStorage.removeItem('authToken');
              localStorage.removeItem('authUser');
            }
          } catch (error) {
            console.error('Token validation error:', error);
            // If validation fails, still try to use stored data
            const normalizedUser = {
              ...parsedUser,
              id: parsedUser.id || parsedUser._id || '',
              _id: parsedUser._id || parsedUser.id || '',
            };
            setToken(storedToken);
            setUser(normalizedUser);
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth from localStorage", error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // --- Refresh user data ---
  const refreshUser = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { user: currentUser } = await response.json();
        const normalizedUser = {
          ...currentUser,
          id: currentUser.id || currentUser._id || '',
          _id: currentUser._id || currentUser.id || '',
        };
        
        setUser(normalizedUser);
        localStorage.setItem('authUser', JSON.stringify(normalizedUser));
      } else {
        // If refresh fails, logout user
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // Don't logout on network errors, just log the error
    }
  };

  // --- Login Function ---
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      handleAuthSuccess(data.token, data.user);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Signup Function ---
  const signup = async (data: SignupData): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Signup failed');
      }

      handleAuthSuccess(responseData.token, responseData.user);
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logout Function ---
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
    setToken(null);
    
    // Optional: Call logout API endpoint for server-side cleanup
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
    
    // Redirect to login page
    router.push('/login');
  };

  // --- Context Value ---
  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};