'use client';

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";



export default function LoginPage() {
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return null;
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general login error
    if (loginError) {
      setLoginError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    try {
      // Call the login function from AuthContext
      await login(formData.email, formData.password);
      
      // Redirect will be handled by the useEffect above
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // This could be implemented for social login
    console.log(`Social login with ${provider}`);
  };

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            Log in to your account
          </h1>
          <p className="text-center text-slate-500 mb-8">
            Don't have an account? 
            <a href="/signup" className="text-blue-600 hover:underline ml-1">
              Sign up
            </a>
          </p>

          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    errors.password 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={isSubmitting}
                />
                <span className="ml-2 text-sm text-slate-600">Remember me</span>
              </label>
              <a href="/forgot" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 relative flex items-center">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-sm">Or continue with</span>
            <div className="flex-grow border-t border-slate-300"></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
  <path fill="#4285F4" d="M24 9.5c3.94 0 6.6 1.7 8.12 3.13l5.94-5.94C34.45 3.3 29.68 1 24 1 14.64 1 6.72 6.64 3.16 14.73l6.9 5.36C11.95 14.9 17.53 9.5 24 9.5z"/>
  <path fill="#34A853" d="M46.1 24.5c0-1.6-.14-3.13-.41-4.6H24v8.7h12.47c-.54 2.8-2.15 5.16-4.58 6.74l7.06 5.48c4.13-3.81 6.15-9.43 6.15-16.32z"/>
  <path fill="#FBBC05" d="M10.06 28.09c-.45-1.3-.7-2.7-.7-4.09s.25-2.79.7-4.09l-6.9-5.36C1.58 16.9 0 20.3 0 24c0 3.7 1.58 7.1 4.16 9.45l6.9-5.36z"/>
  <path fill="#EA4335" d="M24 48c6.48 0 11.9-2.13 15.87-5.8l-7.06-5.48c-2.07 1.38-4.73 2.23-8.81 2.23-6.47 0-12.05-5.4-13.94-12.73l-6.9 5.36C6.72 41.36 14.64 48 24 48z"/>
</svg>
              <span>Google</span>
            </button>
            <button 
              onClick={() => handleSocialLogin('facebook')}
              className="flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}