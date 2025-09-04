"use client";

import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";

/* ------------ Social links ------------ */
const socialLinks = [
  { icon: Facebook, href: "#" },
  { icon: Instagram, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Youtube, href: "#" },
];

/* ------------ Payment icons ------------ */
const PaymentIcons = {
  FlyingBlue: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="#003366" />
      <text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Flying Blue</text>
    </svg>
  ),
  Alipay: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="#00A1E9" />
      <text x="20" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">alipay</text>
    </svg>
  ),
  GPay: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" />
      <path d="M12 8.5h3.5v7H12v-7zm4.5 0h3v7h-3v-7zm4 0H24v7h-3.5v-7z" fill="#4285F4" />
      <path d="M25 10.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5z" fill="#EA4335" />
      <text x="20" y="20" textAnchor="middle" fill="#5f6368" fontSize="6">Pay</text>
    </svg>
  ),
  ApplePay: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="black" />
      <path d="M16.5 7c.3-.4.5-.9.4-1.4-.4 0-.9.3-1.2.6-.3.4-.5.9-.4 1.4.5 0 .9-.2 1.2-.6z" fill="white" />
      <path d="M17 7.5c-.7 0-1.2.4-1.5.4s-.9-.4-1.5-.4c-.8 0-1.5.4-1.9 1.1-.8 1.4-.2 3.5.6 4.6.4.5.8 1.1 1.4 1.1.6 0 .8-.4 1.5-.4s.9.4 1.5.4c.6 0 1-.5 1.4-1.1.5-.6.7-1.2.7-1.2s-1.4-.5-1.4-2c0-1.3 1.1-1.9 1.1-1.9-.6-.9-1.5-.9-1.9-.9z" fill="white" />
      <text x="26" y="16" fill="white" fontSize="6">Pay</text>
    </svg>
  ),
  PayPal: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" />
      <path d="M14.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3h-1.5L15 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3h-1.3l-.4 2.8h1.7z" fill="#003087" />
      <path d="M19.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3H21L20.3 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3H21l-.4 2.8h1.7z" fill="#0070E0" />
    </svg>
  ),
  Amex: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="#006FCF" />
      <text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text>
    </svg>
  ),
  Visa: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" />
      <text x="20" y="16" textAnchor="middle" fill="#1A1F71" fontSize="10" fontWeight="bold">VISA</text>
    </svg>
  ),
  Mastercard: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" aria-hidden="true">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0" />
      <circle cx="16" cy="12" r="6" fill="#FF5F00" />
      <circle cx="24" cy="12" r="6" fill="#EB001B" fillOpacity="0.8" />
    </svg>
  ),
};

const paymentMethods = [
  { name: "Flying Blue", component: PaymentIcons.FlyingBlue },
  { name: "Alipay", component: PaymentIcons.Alipay },
  { name: "G Pay", component: PaymentIcons.GPay },
  { name: "Apple Pay", component: PaymentIcons.ApplePay },
  { name: "PayPal", component: PaymentIcons.PayPal },
  { name: "Amex", component: PaymentIcons.Amex },
  { name: "Visa", component: PaymentIcons.Visa },
  { name: "Mastercard", component: PaymentIcons.Mastercard },
];

export default function Footer() {
  return (
    <footer className="bg-slate-100 text-slate-700 pt-16 pb-10">
      <div className="container mx-auto px-4">

        {/* Top grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

          {/* Column 1: Logo, Description & Destinations */}
          <div className="space-y-6">
             <a href="#" className="inline-block">
               <Image
                 src="/EEO-logo.png" // Ensure this path is correct in your `public` folder
                 alt="Egypt Excursions Online"
                 width={160} // Provide explicit width
                 height={80}  // Provide explicit height
                 className="h-20 w-auto object-contain"
               />
             </a>
             <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
               Book your adventure, skip the lines. Unforgettable tours, tickets, and activities for a memorable journey through Egypt.
             </p>
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
          </div>

          {/* Column 2: Things to do */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Things to do</h3>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:text-red-600 transition-colors" href="#">Things to do in Amsterdam</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Things to do in Berlin</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Things to do in Copenhagen</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Things to do in Rotterdam</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Things to do in Stockholm</a></li>
            </ul>
          </div>

          {/* Column 3: Tours & Tickets */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Tours &amp; Tickets</h3>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:text-red-600 transition-colors" href="#">Contact</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">About us</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Self Rebook</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">FAQ</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Blog</a></li>
              <li><a className="hover:text-red-600 transition-colors" href="#">Careers</a></li>
            </ul>
          </div>

          {/* Column 4: Contact information + newsletter + socials */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Contact information</h3>
            <ul className="space-y-4 text-sm mb-6">
              <li className="flex gap-3">
                <Phone size={18} className="text-red-600 mt-0.5" />
                <div>
                  <div className="font-medium">+201142222920</div>
                  <div className="text-xs text-slate-500">From 8.30 - 17.00 CET/CST</div>
                </div>
              </li>
              <li className="flex gap-3">
                <Mail size={18} className="text-red-600 mt-0.5" />
                <div>
                  <a href="mailto:hello@egyptexcursionsonline.com" className="text-blue-600 hover:underline">
                    hello@egyptexcursionsonline.com
                  </a>
                  <div className="text-xs text-slate-500">We&apos;ll reply within 5 working days</div>
                </div>
              </li>
              <li className="flex gap-3 items-center">
                <MessageSquare size={18} className="text-red-600" />
                <a href="#" className="hover:underline">Chat with us</a>
              </li>
            </ul>

            <div className="mb-6">
              <h4 className="font-bold text-sm mb-3 text-slate-900">Sign up for our newsletter here</h4>
              <form className="flex w-full gap-2">
                <input type="email" placeholder="Your email address" className="flex-1 h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent bg-white" />
                <button type="submit" className="h-11 px-5 rounded-md text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-sm font-semibold">
                  SUBSCRIBE
                </button>
              </form>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-3 text-slate-900">Follow us on social media</h4>
              <div className="flex gap-3">
                {socialLinks.map(({ icon: Icon, href }, i) => (
                  <a key={i} href={href} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-600 transition-colors" aria-label="social link">
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle: rating + payments */}
        <div className="border-t border-slate-300 pt-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
            <div>
              <p className="font-semibold text-slate-900 mb-2">Trusted by our clients</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900 leading-none">4.2</span>
                <div className="flex text-xl leading-none">
                  {[...Array(4)].map((_, i) => ( <span key={i} className="text-red-600">★</span> ))}
                  <span className="text-slate-300">★</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">Average rating from Tripadvisor</p>
            </div>

            <div className="w-full lg:w-auto">
              <h3 className="font-bold text-lg mb-4 text-slate-900">Ways you can pay</h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {paymentMethods.map((m, idx) => (
                  <div key={idx} title={m.name} className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:shadow-sm">
                    <m.component />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-most: currency/lang + small legal row */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-md border border-slate-300 px-2">€&nbsp;&nbsp;EURO</span>
            </span>
            <span className="inline-flex h-6 items-center rounded-md border border-slate-300 px-2">ENGLISH (EN)</span>
          </div>
        </div>

        {/* Tiny legal / credit row */}
        <div className="mt-8 pt-6 border-t border-slate-300 text-xs text-slate-500">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p>© Egypt Excursions Online</p>
            <p className="space-x-2">
              <a className="underline hover:text-slate-700" href="#">Privacy policy</a>
              <span>·</span>
              <a className="underline hover:text-slate-700" href="#">Terms and conditions</a>
            </p>
            <p className="space-x-2">
              <span>Website by <a className="underline hover:text-slate-700" href="#">RDMI Web Services</a></span>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}