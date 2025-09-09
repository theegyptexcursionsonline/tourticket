// components/AuthModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type AuthState = 'login' | 'signup' | 'forgot' | 'forgot-success';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialState?: AuthState;
}

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialState = 'login' }) => {
  const { login, signup } = useAuth();
  
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form data states
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [signupData, setSignupData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  });

  const [forgotEmail, setForgotEmail] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Reset form when modal opens/closes or state changes
  useEffect(() => {
    if (isOpen) {
      setAuthState(initialState);
    } else {
      // Reset everything when modal closes
      setLoginData({ email: '', password: '', rememberMe: false });
      setSignupData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', acceptedTerms: false });
      setForgotEmail('');
      setErrors({});
      setError('');
      setSuccessMessage('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialState]);

  // Clear errors when switching states
  useEffect(() => {
    setError('');
    setErrors({});
    setSuccessMessage('');
  }, [authState]);

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const validateLoginForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!loginData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(loginData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!loginData.password) {
      newErrors.password = 'Password is required';
    } else if (loginData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignupForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!signupData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!signupData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!signupData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(signupData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!signupData.password) {
      newErrors.password = 'Password is required';
    } else if (signupData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(signupData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (!signupData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (signupData.password !== signupData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!signupData.acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await login(loginData.email, loginData.password);
      onClose(); // Close modal on successful login
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await signup({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        password: signupData.password
      });
      onClose(); // Close modal on successful signup
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(forgotEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAuthState('forgot-success');
        setSuccessMessage(data.message);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = () => {
    const password = signupData.password;
    if (!password) return { strength: 0, text: '', color: '' };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) return { strength, text: 'Weak', color: 'text-red-600' };
    if (strength <= 3) return { strength, text: 'Fair', color: 'text-yellow-600' };
    if (strength <= 4) return { strength, text: 'Good', color: 'text-blue-600' };
    return { strength, text: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength();

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (error) setError('');
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              {(authState === 'forgot' || authState === 'forgot-success') && authState !== 'login' && (
                <button
                  onClick={() => setAuthState('login')}
                  className="p-1 rounded-full hover:bg-slate-100 transition-colors mr-1"
                >
                  <ArrowLeft size={20} className="text-slate-600" />
                </button>
              )}
              <h2 className="text-2xl font-bold text-slate-900">
                {authState === 'login' && 'Log In'}
                {authState === 'signup' && 'Sign Up'}
                {authState === 'forgot' && 'Reset Password'}
                {authState === 'forgot-success' && 'Check Your Email'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Login Form */}
            {authState === 'login' && (
              <>
                <p className="text-slate-600 mb-6 text-center">
                  Welcome back! Please sign in to your account.
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="email"
                        id="login-email"
                        value={loginData.email}
                        onChange={(e) => {
                          setLoginData(prev => ({ ...prev, email: e.target.value }));
                          clearError('email');
                        }}
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
                    <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="login-password"
                        value={loginData.password}
                        onChange={(e) => {
                          setLoginData(prev => ({ ...prev, password: e.target.value }));
                          clearError('password');
                        }}
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
                        checked={loginData.rememberMe}
                        onChange={(e) => setLoginData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                      <span className="ml-2 text-sm text-slate-600">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthState('forgot')}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-600">
                    Don't have an account?{' '}
                    <button
                      onClick={() => setAuthState('signup')}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* Signup Form */}
            {authState === 'signup' && (
              <>
                <p className="text-slate-600 mb-6 text-center">
                  Create your account to get started with amazing experiences.
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
                        First Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                          type="text"
                          id="firstName"
                          value={signupData.firstName}
                          onChange={(e) => {
                            setSignupData(prev => ({ ...prev, firstName: e.target.value }));
                            clearError('firstName');
                          }}
                          className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                            errors.firstName 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                          placeholder="First name"
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
                        Last Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                          type="text"
                          id="lastName"
                          value={signupData.lastName}
                          onChange={(e) => {
                            setSignupData(prev => ({ ...prev, lastName: e.target.value }));
                            clearError('lastName');
                          }}
                          className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                            errors.lastName 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                          placeholder="Last name"
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="email"
                        id="signup-email"
                        value={signupData.email}
                        onChange={(e) => {
                          setSignupData(prev => ({ ...prev, email: e.target.value }));
                          clearError('email');
                        }}
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
                    <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="signup-password"
                        value={signupData.password}
                        onChange={(e) => {
                          setSignupData(prev => ({ ...prev, password: e.target.value }));
                          clearError('password');
                        }}
                        className={`w-full pl-10 pr-12 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                          errors.password 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Create a password"
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
                    {signupData.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                passwordStrength.strength <= 2 ? 'bg-red-500' :
                                passwordStrength.strength <= 3 ? 'bg-yellow-500' :
                                passwordStrength.strength <= 4 ? 'bg-blue-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${passwordStrength.color}`}>
                            {passwordStrength.text}
                          </span>
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={signupData.confirmPassword}
                        onChange={(e) => {
                          setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }));
                          clearError('confirmPassword');
                        }}
                        className={`w-full pl-10 pr-12 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                          errors.confirmPassword 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                            : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="Confirm your password"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {signupData.confirmPassword && signupData.password === signupData.confirmPassword && (
                      <div className="mt-1 flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="text-sm">Passwords match</span>
                      </div>
                    )}
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={signupData.acceptedTerms}
                        onChange={(e) => {
                          setSignupData(prev => ({ ...prev, acceptedTerms: e.target.checked }));
                          clearError('terms');
                        }}
                        className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-slate-600">
                        I agree to the{' '}
                        <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="mt-1 text-sm text-red-600">{errors.terms}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-600">
                    Already have an account?{' '}
                    <button
                      onClick={() => setAuthState('login')}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* Forgot Password Form */}
            {authState === 'forgot' && (
              <>
                <p className="text-slate-600 mb-6 text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                      <input
                        type="email"
                        id="forgot-email"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (error) setError('');
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your email address"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Sending reset link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-slate-600">
                    Remember your password?{' '}
                    <button
                      onClick={() => setAuthState('login')}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Back to login
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* Forgot Password Success */}
            {authState === 'forgot-success' && (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Check your email</h3>
                <p className="text-slate-600 text-sm mb-6">
                  {successMessage}
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">Next steps:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Check your email inbox (and spam folder)</li>
                    <li>• Click the reset password link</li>
                    <li>• Create a new password</li>
                    <li>• Log in with your new password</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setAuthState('forgot');
                      setForgotEmail('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Send another email
                  </button>
                  
                  <button
                    onClick={() => setAuthState('login')}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            )}

            {/* Social Login (for login and signup states) */}
            {(authState === 'login' || authState === 'signup') && (
              <>
                <div className="mt-6 relative flex items-center">
                  <div className="flex-grow border-t border-slate-300"></div>
                  <span className="flex-shrink mx-4 text-slate-500 text-sm">Or continue with</span>
                  <div className="flex-grow border-t border-slate-300"></div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button 
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
                    className="flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;