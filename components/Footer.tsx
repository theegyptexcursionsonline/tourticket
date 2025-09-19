'use client';

import React, { useState, useEffect } from "react";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Destination } from '@/types';
import toast, { Toaster } from 'react-hot-toast';

// Import the single, consolidated switcher component
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';

// =================================================================
// --- FOOTER-SPECIFIC DATA ---
// =================================================================

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com" },
  { icon: Instagram, href: "https://instagram.com" },
  { icon: Twitter, href: "https://twitter.com" },
  { icon: Youtube, href: "https://youtube.com" },
];

const PaymentIcons = {
  Visa: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><text x="20" y="16" textAnchor="middle" fill="#1A1F71" fontSize="10" fontWeight="bold">VISA</text></svg>,
  Mastercard: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><circle cx="16" cy="12" r="6" fill="#FF5F00" /><circle cx="24" cy="12" r="6" fill="#EB001B" fillOpacity="0.8" /></svg>,
  Amex: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#006FCF" /><text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text></svg>,
  PayPal: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><path d="M14.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3h-1.5L15 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3h-1.3l-.4 2.8h1.7z" fill="#003087" /><path d="M19.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3H21L20.3 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3H21l-.4 2.8h1.7z" fill="#0070E0" /></svg>,
  Alipay: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="#00A1E9" /><text x="20" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">alipay</text></svg>,
  GPay: () => <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" /><path d="M12 8.5h3.5v7H12v-7zm4.5 0h3v7h-3v-7zm4 0H24v7h-3.5v-7z" fill="#4285F4" /><path d="M25 10.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5z" fill="#EA4335" /><text x="20" y="20" textAnchor="middle" fill="#5f6368" fontSize="6">Pay</text></svg>,
};

const paymentMethods = [
  { name: "Visa", component: PaymentIcons.Visa },
  { name: "Mastercard", component: PaymentIcons.Mastercard },
  { name: "Amex", component: PaymentIcons.Amex },
  { name: "PayPal", component: PaymentIcons.PayPal },
  { name: "Alipay", component: PaymentIcons.Alipay },
  { name: "G Pay", component: PaymentIcons.GPay },
];

// =================================================================
// --- FOOTER COMPONENT ---
// =================================================================
export default function Footer() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch('/api/admin/tours/destinations');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setDestinations(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch destinations for footer:", error);
      }
    };
    fetchDestinations();
  }, []);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Subscribing...');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Subscription failed.');
      }
      
      toast.success('Thank you for subscribing!', { id: toastId });
      setEmail(''); // Reset email input

    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const openChatbot = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-chatbot'));
    }
  };

  return (
    <footer className="bg-[#E9ECEE] text-slate-700">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-8">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-6 items-start">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-6">
            <Link href="/" className="inline-block">
              <Image
                src="/EEO-logo.png"
                alt="Egypt Excursions Online"
                width={160}
                height={80}
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
              Book your adventure, skip the lines. Unforgettable tours, tickets, and activities for a memorable journey.
            </p>
          </div>

          {/* Column 2: Things To Do */}
          <div>
            <h3 className="font-bold text-base lg:text-lg mb-4 text-slate-900">Things to do</h3>
            <ul className="space-y-2 text-sm">
              {destinations.slice(0, 5).map((destination) => (
                <li key={destination._id}>
                  <Link 
                    className="hover:text-red-600 transition-colors" 
                    href={`/destinations/${destination.slug}`}
                  >
                    Things to do in {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h3 className="font-bold text-base lg:text-lg mb-4 text-slate-900">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="hover:text-red-600 transition-colors" href="/about">About Us</Link></li>
              <li><Link className="hover:text-red-600 transition-colors" href="/contact">Contact</Link></li>
              <li><Link className="hover:text-red-600 transition-colors" href="/faqs">FAQ</Link></li>
              <li><Link className="hover:text-red-600 transition-colors" href="/careers">Careers</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact & Newsletter */}
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-base lg:text-lg mb-4 text-slate-900">Contact Us</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <Phone size={18} className="text-red-600 mt-0.5" />
                  <a href="tel:+201142222920" className="hover:text-red-600">+201142222920</a>
                </li>
                <li className="flex gap-3">
                  <Mail size={18} className="text-red-600 mt-0.5" />
                  <a href="mailto:hello@egyptexcursionsonline.com" className="text-blue-600 hover:underline">hello@egyptexcursionsonline.com</a>
                </li>
              </ul>
            </div>
            {/* Newsletter */}
            <div>
              <h4 className="font-bold text-sm mb-3 text-slate-900">Sign up for our newsletter</h4>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address" 
                  className="flex-1 h-11 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600" 
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  className="h-11 px-4 sm:px-5 rounded-md text-white bg-slate-800 hover:bg-red-600 transition-colors text-sm font-semibold flex items-center justify-center disabled:bg-slate-500"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'SUBSCRIBE'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-300 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              © {new Date().getFullYear()} Egypt Excursions Online. All rights reserved.
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href }, i) => (
                <a 
                  key={i} 
                  href={href} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-red-600" 
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}