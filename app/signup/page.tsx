'use client';

import React, { useEffect } from "react";
import { Facebook } from "lucide-react";
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
  const { user, isLoading, loginWithRedirect, isAuthenticated } = useAuth();
  const router = useRouter();

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

  const handleSignUp = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      }
    });
  };

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

          <div className="space-y-4">
            <button 
              onClick={handleSignUp}
              className="w-full flex items-center justify-center gap-2 p-4 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors text-lg"
            >
              Get Started with Auth0
            </button>
          </div>

          <div className="mt-8 relative flex items-center">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-sm">Join thousands of travelers</span>
            <div className="flex-grow border-t border-slate-300"></div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 mb-4">
              Quick registration with your social account
            </p>
            <button 
              onClick={handleSignUp}
              className="w-full flex items-center justify-center gap-3 p-3 border-2 border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 hover:border-red-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Image src="/icons/google.svg" alt="Google" width={20} height={20} />
                <span>Google</span>
              </div>
              <div className="border-l border-slate-300 h-6 mx-2"></div>
              <div className="flex items-center gap-2">
                <Facebook size={20} className="text-blue-600" />
                <span>Facebook</span>
              </div>
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

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              By signing up, you agree to our{' '}
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