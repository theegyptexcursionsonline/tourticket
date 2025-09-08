'use client';

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/images/dark-hero-bg.jpg"
          alt="Abstract dark background"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
          Your Best Travel Buddy
        </h1>
        <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto opacity-80">
          Discover hidden gems and unforgettable experiences with our expert guidance.
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const { user, isLoading, isAuthenticated, signup } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
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
    
    // Clear general signup error
    if (signupError) {
      setSignupError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSignupError('');

    try {
      // Call the signup function from AuthContext
      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });
      
      // Redirect will be handled by the useEffect above
    } catch (error: any) {
      console.error('Signup error:', error);
      setSignupError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialSignup = (provider: string) => {
    // This could be implemented for social signup
    console.log(`Social signup with ${provider}`);
  };

  const getPasswordStrength = () => {
    const password = formData.password;
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

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
        <div className="w-full max-w-lg bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
            Create a new account
          </h1>
          <p className="text-center text-slate-500 mb-8">
            Already have an account? 
            <a href="/login" className="text-blue-600 hover:underline ml-1">
              Log in
            </a>
          </p>

          {signupError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{signupError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
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
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
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
              {formData.password && (
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
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
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
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
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
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (errors.terms) {
                      setErrors(prev => ({ ...prev, terms: '' }));
                    }
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
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-8 relative flex items-center">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-sm">Or sign up with</span>
            <div className="flex-grow border-t border-slate-300"></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSocialSignup('google')}
              className="flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              <Image src="/icons/google.svg" alt="Google" width={20} height={20} />
              <span>Google</span>
            </button>
            <button 
              onClick={() => handleSocialSignup('facebook')}
              className="flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Why join us?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Save your favorite tours and destinations</li>
              <li>• Track your booking history</li>
              <li>• Get exclusive member discounts</li>
              <li>• Receive personalized travel recommendations</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}