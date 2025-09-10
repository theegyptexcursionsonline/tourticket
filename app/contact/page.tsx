'use client';

import React from "react";
import { Phone, Mail, MessageSquare, Facebook, Instagram, Twitter, Youtube, ChevronDown, Menu, Search } from "lucide-react";
import Image from "next/image";

// Reusable Header and Footer components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- DARK HERO SECTION COMPONENT ---
// This is the new component to be added above the Header.
// =================================================================
function DarkHero() {
  return (
    <div className="relative h-96 bg-slate-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      {/* Background Image/Overlay for Visuals */}
      <div className="absolute inset-0 z-0 opacity-20">
        <Image
          src="/about.png" // Placeholder for a dark, stylish background image
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
// --- CONTACT US PAGE COMPONENT ---
// =================================================================
export default function ContactUsPage() {
  const socialLinks = [
    { icon: Facebook, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Youtube, href: "#" },
  ];

  return (
    <div className="bg-white text-slate-800">
      {/* 1. Add the new DarkHero component before the Header. 
        Note: The Header component from your files needs to be updated 
        to be transparent and absolute to sit on top of this hero section.
        I will assume you can make this change in your `components/Header.js` file.
      */}
      <DarkHero />
      <Header />

      {/* Main Contact Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-slate-900 mb-4">
            Get in touch with us
          </h1>
          <p className="text-center text-slate-600 max-w-2xl mx-auto mb-12">
            We're here to help! Whether you have questions about a booking, need support, or just want to say hello, feel free to reach out.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Information Column */}
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Contact Information</h2>
                <ul className="space-y-4 text-slate-700">
                  <li className="flex gap-4 items-start">
                    <Phone size={24} className="text-red-600 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">+201142222920</div>
                      <div className="text-sm text-slate-500">From 8.30 - 17.00 EET</div>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <Mail size={24} className="text-red-600 flex-shrink-0" />
                    <div>
                      <a 
                        href="mailto:hello@egyptexcursionsonline.com" 
                        className="font-semibold text-blue-600 hover:underline break-all"
                      >
                        hello@egyptexcursionsonline.com
                      </a>
                      <div className="text-sm text-slate-500">Replies within 2 working days</div>
                    </div>
                  </li>
                  <li className="flex gap-4 items-center">
                    <MessageSquare size={24} className="text-red-600 flex-shrink-0" />
                    <a href="#" className="font-semibold text-slate-700 hover:text-red-600 transition-colors">
                      Chat with us
                    </a>
                  </li>
                </ul>
              </div>
              
              {/* Social Media Links */}
              <div>
                <h3 className="font-bold text-lg text-slate-900 mb-4">Follow us on social media</h3>
                <div className="flex gap-3">
                  {socialLinks.map(({ icon: Icon, href }, i) => (
                    <a 
                      key={i} 
                      href={href} 
                      className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-red-600 transition-colors" 
                      aria-label={`Follow us on ${Icon.displayName || 'social media'}`}
                    >
                      <Icon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form Column */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Send us a message</h2>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input 
                    type="text" 
                    id="name" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Your Email
                  </label>
                  <input 
                    type="email" 
                    id="email" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                    Message
                  </label>
                  <textarea 
                    id="message" 
                    rows="4" 
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
                  ></textarea>
                </div>
                <button
                  type="submit" 
                  className="w-full h-12 px-6 rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors font-semibold shadow-md"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Reusable Footer */}
      <Footer />
    </div>
  );
}