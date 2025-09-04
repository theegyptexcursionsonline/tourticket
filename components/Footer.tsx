'use client';

import React from "react";
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare } from "lucide-react";
import Image from "next/image";

// Import the single, consolidated switcher component
import CurrencyLanguageSwitcher from '@/components/shared/CurrencyLanguageSwitcher';

// =================================================================
// --- FOOTER-SPECIFIC DATA ---
// =================================================================

const socialLinks = [
  { icon: Facebook, href: "#" },
  { icon: Instagram, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Youtube, href: "#" },
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
  return (
    <footer className="bg-[#E9ECEE] text-slate-700 pt-16 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-6">
             <a href="/" className="inline-block">
               <Image
                 src="/EEO-logo.png"
                 alt="Egypt Excursions Online"
                 width={160}
                 height={80}
                 className="h-20 w-auto object-contain"
               />
             </a>
             <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
               Book your adventure, skip the lines. Unforgettable tours, tickets, and activities for a memorable journey through Egypt.
             </p>
          </div>

          {/* Column 2: Destinations */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Destinations</h3>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:text-red-600 transition-colors" href="#">Amsterdam</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Berlin</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Copenhagen</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Rotterdam</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Stockholm</a></li>
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Tours &amp; Tickets</h3>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:text-red-600 transition-colors" href="#">Contact</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">About us</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">FAQ</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Blog</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Careers</a></li>
            </ul>
          </div>

          {/* Column 4: Contact & Social */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Contact information</h3>
            <ul className="space-y-4 text-sm mb-6">
              <li className="flex gap-3"><Phone size={18} className="text-red-600 mt-0.5" /><div><div className="font-medium">+201142222920</div><div className="text-xs text-slate-500">From 8.30 - 17.00 EET</div></div></li>
              <li className="flex gap-3"><Mail size={18} className="text-red-600 mt-0.5" /><div><a href="mailto:hello@egyptexcursionsonline.com" className="text-blue-600 hover:underline">hello@egyptexcursionsonline.com</a><div className="text-xs text-slate-500">Replies within 2 working days</div></div></li>
              <li className="flex gap-3 items-center"><MessageSquare size={18} className="text-red-600" /><a href="#" className="hover:underline">Chat with us</a></li>
            </ul>
            
            <div>
              <h4 className="font-bold text-sm mb-3 text-slate-900">Follow us on social media</h4>
              <div className="flex gap-3">{socialLinks.map(({ icon: Icon, href }, i) => (<a key={i} href={href} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-600 transition-colors" aria-label={`Follow us on ${Icon.displayName || 'social media'}`}><Icon size={18} /></a>))}</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-300 pt-8">
          <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:justify-between">
            
            {/* Currency/Language switcher */}
            <CurrencyLanguageSwitcher variant="footer" />

            {/* Payment Methods */}
            <div className="w-full md:w-auto">
              <h3 className="font-bold text-lg mb-4 text-slate-900 text-center md:text-right">Ways you can pay</h3>
              <div className="grid grid-cols-6 sm:grid-cols-6 gap-3">{paymentMethods.map((m, idx) => (<div key={idx} title={m.name} className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:shadow-sm"><m.component /></div>))}</div>
            </div>

          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-300 text-xs text-slate-500 text-center">
            <p className="space-x-2 mb-2">
              <a className="underline hover:text-slate-700" href="#">Privacy policy</a>
              <span>·</span>
              <a className="underline hover:text-slate-700" href="#">Terms and conditions</a>
            </p>
            <p>© {new Date().getFullYear()} Egypt Excursions Online. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}