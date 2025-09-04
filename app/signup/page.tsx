'use client';

import React from "react";
import { Facebook, Twitter, Mail, Search, Menu, ChevronDown, User, Lock, Google } from "lucide-react";
import Image from "next/image";

// Import reusable components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
// Reusing this component to maintain consistent styling.
// =================================================================
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/images/dark-hero-bg.jpg" // Placeholder for a dark, stylish background image
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

// =================================================================
// --- SIGN-UP PAGE COMPONENT ---
// =================================================================
export default function SignUpPage() {
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

          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="email"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirm-password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shadow-md"
            >
              Sign up
            </button>
          </form>

          <div className="mt-8 relative flex items-center">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-sm">Or continue with</span>
            <div className="flex-grow border-t border-slate-300"></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button className="flex-1 flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Image src="/icons/google.svg" alt="Google" width={20} height={20} />
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 p-3 border border-slate-300 rounded-md font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Facebook size={20} className="text-blue-600" />
              Facebook
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}