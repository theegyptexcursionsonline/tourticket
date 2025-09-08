'use client';

import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";



export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous states
    setError('');
    setSuccessMessage('');
    
    // Validation
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        setSuccessMessage(data.message);
        setEmail(''); // Clear form
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setSuccessMessage('');
    setError('');
  };

  if (isSuccess) {
    return (
      <div className="bg-white text-slate-800 min-h-screen flex flex-col">
        <Header />

        <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
          <div className="w-full max-w-md bg-white p-8 sm:p-12 rounded-lg shadow-lg text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Check your email
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                {successMessage}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Next steps:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Check your email inbox (and spam folder)</li>
                  <li>• Click the reset password link</li>
                  <li>• Create a new password</li>
                  <li>• Log in with your new password</li>
                </ul>
              </div>

              <button
                onClick={handleTryAgain}
                className="w-full h-12 bg-slate-100 text-slate-700 rounded-md font-semibold hover:bg-slate-200 transition-colors"
              >
                Send another email
              </button>

              <Link 
                href="/login"
                className="block w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors text-center leading-12"
              >
                Back to login
              </Link>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500">
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={handleTryAgain}
                  className="text-blue-600 hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center py-12 px-4 bg-[#E9ECEE]">
        <div className="w-full max-w-md bg-white p-8 sm:p-12 rounded-lg shadow-lg">
          <div className="mb-8">
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline mb-6"
            >
              <ArrowLeft size={16} />
              <span>Back to login</span>
            </Link>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-2">
              Forgot your password?
            </h1>
            <p className="text-center text-slate-500 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
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
                  value={email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    error 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Sending reset link...
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-slate-300"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-sm">Need help?</span>
              <div className="flex-grow border-t border-slate-300"></div>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
              <p className="text-slate-600">
                Having trouble?{' '}
                <a href="/contact" className="text-blue-600 hover:underline font-medium">
                  Contact support
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Security tip</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              For your security, we'll only send password reset emails to registered accounts. 
              If you don't receive an email, please check your spam folder or try a different email address.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}