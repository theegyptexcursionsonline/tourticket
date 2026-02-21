'use client';

import React, { useState, useEffect } from "react";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, Loader2 } from "lucide-react";
import Image from "next/image";
import { Link } from '@/i18n/routing';
import { useNavData } from '@/contexts/NavDataContext';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslations } from 'next-intl';

// Import the single, consolidated switcher component
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';

// =================================================================
// --- FOOTER-SPECIFIC DATA ---
// =================================================================
const socialLinks = [
  { icon: Facebook, href: "https://web.facebook.com/EGexcursionsonline/?_rdc=1&_rdr#" },
  { icon: Instagram, href: "https://www.instagram.com/egyptexcursionsonline/" },
  { icon: Twitter, href: "https://x.com/excursiononline" },
  { icon: Youtube, href: "https://www.youtube.com/@egyptexcursionsonline6859" },
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
  const { destinations } = useNavData();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const t = useTranslations('footer');

  // Listen for open-chatbot events (dispatched by openChatbot)
  useEffect(() => {
    const handler = () => {
      // Prefer openIntercom helper if available, then window.Intercom("show")
      try {
        if (typeof (window as any).openIntercom === 'function') {
          (window as any).openIntercom();
          return;
        }
        if (typeof (window as any).Intercom === 'function') {
          (window as any).Intercom('show');
          return;
        }
        // Try messenger instance directly
        if ((window as any).__intercomMessenger && typeof (window as any).__intercomMessenger.showMessenger === 'function') {
          (window as any).__intercomMessenger.showMessenger();
          return;
        }
        console.warn('Intercom not initialized yet');
      } catch (err) {
        console.error('Failed to open Intercom:', err);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('open-chatbot', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('open-chatbot', handler as EventListener);
      }
    };
  }, []);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('invalidEmail'));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || t('subscribeSuccess'));
        setEmail('');
        setIsSubscribed(true);
      } else {
        toast.error(data.message || t('subscribeFailed'));
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(t('subscribeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const openChatbot = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('🔵 Footer: Chat button clicked');
    
    // Try to open Intercom directly
    try {
      if (typeof window === 'undefined') {
        console.warn('🔴 Footer: window is undefined');
        return;
      }
      
      const win = window as any;
      
      console.log('🔵 Footer: Checking Intercom availability...');
      console.log('  - openIntercom:', typeof win.openIntercom);
      console.log('  - Intercom:', typeof win.Intercom);
      console.log('  - __intercomMessenger:', !!win.__intercomMessenger);
      
      // Method 1: Try openIntercom helper
      if (typeof win.openIntercom === 'function') {
        console.log('✅ Footer: Using openIntercom()');
        win.openIntercom();
        return;
      }
      
      // Method 2: Try window.Intercom('show')
      if (typeof win.Intercom === 'function') {
        console.log('✅ Footer: Using Intercom("show")');
        win.Intercom('show');
        return;
      }
      
      // Method 3: Try messenger instance directly
      if (win.__intercomMessenger) {
        console.log('🔵 Footer: Found __intercomMessenger, checking methods...');
        console.log('  - showMessenger:', typeof win.__intercomMessenger.showMessenger);
        console.log('  - show:', typeof win.__intercomMessenger.show);
        console.log('  - Methods:', Object.keys(win.__intercomMessenger));
        
        if (typeof win.__intercomMessenger.showMessenger === 'function') {
          console.log('✅ Footer: Using __intercomMessenger.showMessenger()');
          win.__intercomMessenger.showMessenger();
          return;
        }
        if (typeof win.__intercomMessenger.show === 'function') {
          console.log('✅ Footer: Using __intercomMessenger.show()');
          win.__intercomMessenger.show();
          return;
        }
      }
      
      console.warn('⚠️ Footer: Intercom not available, will retry...');
      
      // Method 4: Wait a bit and retry (in case Intercom is still loading)
      setTimeout(() => {
        console.log('🔵 Footer: Retrying after 500ms...');
        if (typeof win.openIntercom === 'function') {
          console.log('✅ Footer: Retry - Using openIntercom()');
          win.openIntercom();
          return;
        }
        if (typeof win.Intercom === 'function') {
          console.log('✅ Footer: Retry - Using Intercom("show")');
          win.Intercom('show');
          return;
        }
        if (win.__intercomMessenger) {
          if (typeof win.__intercomMessenger.showMessenger === 'function') {
            console.log('✅ Footer: Retry - Using __intercomMessenger.showMessenger()');
            win.__intercomMessenger.showMessenger();
            return;
          }
          if (typeof win.__intercomMessenger.show === 'function') {
            console.log('✅ Footer: Retry - Using __intercomMessenger.show()');
            win.__intercomMessenger.show();
            return;
          }
        }
        console.warn('⚠️ Footer: All methods failed, dispatching event');
        window.dispatchEvent(new CustomEvent('open-chatbot'));
      }, 500);
      
      // Also dispatch event immediately as fallback
      window.dispatchEvent(new CustomEvent('open-chatbot'));
      
    } catch (err) {
      console.error('🔴 Footer: Failed to open Intercom:', err);
      // Fallback to event dispatch
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-chatbot'));
      }
    }
  };

  return (
    <footer className="bg-white text-slate-700 pb-20 md:pb-24">
      <Toaster position="top-center" />
      <div className="container mx-auto px-4 py-12">

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6 mb-6 items-start bg-slate-50 border border-slate-100 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)]">

          {/* Column 1: Brand Info, Trust Badge & Payment Methods */}
          <div className="space-y-6 lg:col-span-2">
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
              {t('tagline')}
            </p>

            {/* Trusted by clients */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <p className="font-semibold text-slate-900 mb-3 text-base">{t('trustedBy')}</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900 leading-none">4.9</span>
                <div className="flex text-xl leading-none text-red-500">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">{t('averageRating')}</p>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-base mb-4 text-slate-900">{t('waysToPlay')}</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {paymentMethods.map((method, idx) => (
                  <div
                    key={idx}
                    title={method.name}
                    className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:shadow-sm transition-shadow aspect-[5/3]"
                  >
                    <method.component />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Things To Do */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base lg:text-lg text-slate-900 tracking-wide">{t('thingsToDo')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {destinations.slice(0, 5).map((destination) => (
                <li key={destination._id}>
                  <Link 
                    className="hover:text-red-600 transition-colors inline-flex items-center gap-2" 
                    href={`/destinations/${destination.slug}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {t('thingsToDoIn', { destination: destination.name })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Destinations & Company Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-base lg:text-lg text-slate-900 tracking-wide">{t('destinations')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              {destinations.slice(0, 5).map((destination) => (
                <li key={destination._id}>
                  <Link 
                    className="hover:text-red-600 transition-colors inline-flex items-center gap-2" 
                    href={`/destinations/${destination.slug}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {destination.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <h3 className="font-semibold text-base lg:text-lg text-slate-900 tracking-wide">{t('toursTickets')}</h3>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/contact"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('contact')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/about"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('aboutUs')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/blog"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('blog')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/faqs"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('faq')}</Link></li>
                <li><Link className="hover:text-red-600 transition-colors inline-flex items-center gap-2" href="/careers"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />{t('careers')}</Link></li>
              </ul>
            </div>
          </div>

          {/* Column 4: Contact, Newsletter & Social Media */}
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-semibold text-base lg:text-lg mb-4 text-slate-900 tracking-wide">{t('contactInfo')}</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600"><Phone size={18} /></span>
                  <div className="flex flex-col">
                    <a href="tel:+201142255624" className="font-semibold text-slate-900 hover:text-red-600 transition-colors">+20 11 42255624</a>
                    <span className="text-xs text-slate-500">{t('support247')}</span>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Mail size={18} /></span>
                  <div>
                    <a href="mailto:booking@egypt-excursionsonline.com" className="font-semibold text-slate-900 hover:text-red-600 transition-colors break-all">
                      booking@egypt-excursionsonline.com
                    </a>
                    <p className="text-xs text-slate-500">{t('repliesWithinHour')}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><MessageSquare size={18} /></span>
                  <button
                    type="button"
                    onClick={openChatbot}
                    className="text-sm font-semibold text-slate-900 hover:text-red-600 transition-colors cursor-pointer text-left"
                    aria-label="Open chat"
                  >
                    {t('chatWithUs')}
                  </button>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              {!isSubscribed ? (
                <>
                  <h4 className="font-semibold text-base mb-2 text-slate-900">{t('newsletter')}</h4>
                  <p className="text-xs text-slate-500 mb-3">{t('newsletterDesc')}</p>
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')} 
                      className="w-full sm:flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 bg-white shadow-sm" 
                      disabled={isLoading}
                    />
                    <button 
                      type="submit" 
                      className="h-11 w-full sm:w-auto px-4 sm:px-6 rounded-xl text-white bg-gradient-to-r from-red-600 to-slate-900 hover:from-red-700 hover:to-slate-950 transition-colors text-sm font-semibold flex items-center justify-center disabled:bg-slate-500"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : t('subscribe')}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <h4 className="font-bold text-sm mb-2 text-green-600">{t('newsletterThanksTitle')}</h4>
                  <p className="text-sm text-slate-600">{t('newsletterThanksDesc')}</p>
                </div>
              )}
            </div>
            
            {/* Social Media */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="font-semibold text-base mb-2 text-slate-900">{t('followUs')}</h4>
              <p className="text-xs text-slate-500 mb-3">{t('socialDesc')}</p>
              <div className="flex gap-3">
                {socialLinks.map(({ icon: Icon, href }, i) => (
                  <a 
                    key={i} 
                    href={href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-600 transition-colors border border-slate-200" 
                    aria-label={t('followSocialAria')}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Currency/Language Switcher */}
        <div className="border-t border-slate-300 pt-4 mb-4">
          <CurrencyLanguageSwitcher variant="footer" />
        </div>

        {/* Legal Footer */}
        <div className="border-t border-slate-300 pt-4 text-xs text-slate-500 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3">
            <Link className="underline hover:text-slate-700 transition-colors" href="/privacy">{t('privacyPolicy')}</Link>
            <span className="hidden sm:inline">·</span>
            <Link className="underline hover:text-slate-700 transition-colors" href="/terms">{t('termsConditions')}</Link>
          </div>
          <p>© {new Date().getFullYear()} Egypt Excursions Online. {t('copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
