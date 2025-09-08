'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture?: string;
  createdAt: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  loginWithRedirect: () => void; // Keep for backward compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Validate token and get user data
        const userData = await validateToken(token);
        if (userData) {
          setUser(userData);
        } else {
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const validateToken = async (token: string): Promise<User | null> => {
    try {
      // In a real app, you would validate the token with your backend
      // For now, we'll check if there's user data in localStorage
      const userDataString = localStorage.getItem('user_data');
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Simulate API call - replace with your actual authentication endpoint
      const response = await mockLoginAPI(email, password);
      
      if (response.success) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: `${response.user.firstName} ${response.user.lastName}`,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          picture: response.user.picture,
          createdAt: response.user.createdAt
        };
        
        // Store auth token and user data
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        setUser(userData);
        router.push('/');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Simulate API call - replace with your actual registration endpoint
      const response = await mockSignupAPI(data);
      
      if (response.success) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          name: `${response.user.firstName} ${response.user.lastName}`,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          picture: response.user.picture,
          createdAt: response.user.createdAt
        };
        
        // Store auth token and user data
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        setUser(userData);
        router.push('/');
      } else {
        throw new Error(response.message || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setUser(null);
    router.push('/');
  };

  const loginWithRedirect = () => {
    // Keep for backward compatibility - redirect to login page
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    loginWithRedirect
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Mock API functions - replace these with actual API calls
const mockLoginAPI = async (email: string, password: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock user database
  const mockUsers = [
    {
      id: '1',
      email: 'demo@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      email: 'user@test.com',
      password: 'test123',
      firstName: 'Jane',
      lastName: 'Smith',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ];
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    return {
      success: true,
      token: `mock_token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      }
    };
  } else {
    // Check if user exists with different password
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      throw new Error('Invalid password. Please check your credentials.');
    } else {
      throw new Error('No account found with this email address.');
    }
  }
};

const mockSignupAPI = async (data: SignupData) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if user already exists
  const existingUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
  const userExists = existingUsers.some((user: any) => user.email === data.email);
  
  if (userExists) {
    throw new Error('An account with this email already exists.');
  }
  
  // Create new user
  const newUser = {
    id: `user_${Date.now()}`,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    createdAt: new Date().toISOString()
  };
  
  // Store user in localStorage (in real app, this would be your backend)
  existingUsers.push({ ...newUser, password: data.password });
  localStorage.setItem('registered_users', JSON.stringify(existingUsers));
  
  return {
    success: true,
    token: `mock_token_${newUser.id}_${Date.now()}`,
    user: newUser
  };
};