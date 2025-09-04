// src/components/Footer.jsx

import { Star, Phone, Mail, MessageSquare, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

// --- DATA CONFIGURATION ---
// This makes the footer easy to update.

const footerLinks = [
  {
    title: 'Destinations',
    links: ['Cairo', 'Giza', 'Luxor', 'Aswan', 'Alexandria', 'Sharm El Sheikh'],
  },
  {
    title: 'Things to do',
    links: ['Pyramid Tours', 'Nile Cruises', 'Desert Safari', 'Museum Visits', 'Red Sea Diving', 'Hot Air Balloon'],
  },
  {
    title: 'Egypt Excursions',
    links: ['About Us', 'Contact', 'FAQ', 'Blog', 'Careers', 'Self Rebook'],
  },
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

// Self-contained SVG components for payment methods for a clean, dependency-free implementation.
const PaymentIcons = {
  FlyingBlue: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#003366"/><text x="24" y="19" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Flying Blue</text></svg>,
  Alipay: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#00A1E9"/><text x="24" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">alipay</text></svg>,
  GPay: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="30" rx="4" fill="white" stroke="#E0E0E0"/><g clipPath="url(#clip0_105_2)"><path d="M22.14 14.04V12.58H25.98C26.1 13.24 26.22 13.9 26.22 14.4C26.22 17.7 24.18 20 21.6 20C19.02 20 17 17.76 17 15C17 12.24 19.02 10 21.6 10C22.82 10 23.9 10.46 24.72 11.22L23.6 12.32C23.12 11.88 22.44 11.54 21.6 11.54C20.06 11.54 18.78 12.86 18.78 14.98C18.78 17.1 20.06 18.44 21.6 18.44C23.24 18.44 23.86 17.3 23.98 16.58H21.6V15.1H25.86C25.9 15.46 25.92 15.78 25.92 16.08C25.92 16.78 25.76 18.06 24.84 19.02C24.04 19.86 22.94 20.4 21.62 20.4C18.76 20.4 16.6 18.06 16.6 15C16.6 11.94 18.76 9.6 21.62 9.6C23.46 9.6 24.78 10.3 25.7 11.18L26.86 10.02C25.92 9.18 24.28 8 21.62 8C18.02 8 15 11.12 15 15C15 18.88 18.02 22 21.62 22C24.3 22 26.12 20.3 26.12 17.62C26.12 16.92 26.06 16.34 25.94 15.8H22.14V14.04Z" fill="#5F6368"/><path d="M32 14.18C32 11.24 29.92 9 27 9C24.08 9 22 11.24 22 14.18C22 17.12 24.08 19.36 27 19.36C29.92 19.36 32 17.12 32 14.18ZM29.84 14.18C29.84 15.96 28.58 17.4 27 17.4C25.42 17.4 24.16 15.96 24.16 14.18C24.16 12.4 25.42 10.96 27 10.96C28.58 10.96 29.84 12.4 29.84 14.18Z" fill="#EA4335"/><path d="M21.2 14.18C21.2 11.24 19.12 9 16.2 9C13.28 9 11.2 11.24 11.2 14.18C11.2 17.12 13.28 19.36 16.2 19.36C19.12 19.36 21.2 17.12 21.2 14.18ZM19.04 14.18C19.04 15.96 17.78 17.4 16.2 17.4C14.62 17.4 13.36 15.96 13.36 14.18C13.36 12.4 14.62 10.96 16.2 10.96C17.78 10.96 19.04 12.4 19.04 14.18Z" fill="#FBBC05"/><path d="M10.4 9.2V18.8H8.2V9.2H10.4Z" fill="#4285F4"/></g><defs><clipPath id="clip0_105_2"><rect width="20" height="14" fill="white" transform="translate(8 8)"/></clipPath></defs></svg>,
  ApplePay: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="black"/><path d="M22.25 14.88c.02-1.7 1.34-2.58 1.4-2.6-.02 0-1.1-1.68-2.8-1.74-1.34-.06-2.52.8-3.16.8-.66 0-1.8.76-3.04-1.12-1.46-2.22-.5-5.46 1.48-7.26 1.1-.98 2.38-1.52 3.7-1.52.68 0 2.22.34 3.52 1.94l.2.24-1.82 1.1c-.24-.36-.92-1.3-1.88-1.3-.84 0-1.64.6-2.22.6s-1.28-.58-2.4-.58c-1.44 0-2.8.9-3.48 2.24-1.04 2.1.2 4.54.2 4.56.02 0 .96 1.5 2.5 1.5 1.28 0 2-.6 2.66-.6s1.38.58 2.6.58c1.6 0 2.38-1.04 2.5-1.12l-.01.01zm-3.47-8.38c.6-.74 1-1.8 1-2.92.02-.1-2.02.66-2.7 1.4.52.64.88 1.46.96 2.34.6.02 1.04-.3 1.74-.82z" fill="white"/></svg>,
  PayPal: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="white" stroke="#E0E0E0"/><path d="M17.3 12.2c0-.1.2-1 .9-1.6.6-.5 1.5-.8 2.5-.8h4.8c2.8 0 4.7 1.4 4.3 4.2-.3 2.1-1.8 3.3-3.9 3.3h-1.9c-.5 0-.7.3-.8.8l-.4 2.5c-.1.3-.3.5-.6.5h-1.9c-.3 0-.5-.2-.4-.6l.7-4.1c.1-.3.3-.5.6-.5h.6c.9 0 1.6-.5 1.8-1.4.3-1.1-.2-1.8-1.2-1.8h-1.7c-1 0-1.9.5-2.2 1.4l-1.3 4.8c-.1.3-.3.5-.6.5h-1.9c-.3 0-.5-.2-.4-.6l2.1-7.8z" fill="#003087"/><path d="M24.2 12.2c0-.1.2-1 .9-1.6.6-.5 1.5-.8 2.5-.8h4.8c2.8 0 4.7 1.4 4.3 4.2-.3 2.1-1.8 3.3-3.9 3.3h-1.9c-.5 0-.7.3-.8.8l-.4 2.5c-.1.3-.3.5-.6.5h-1.9c-.3 0-.5-.2-.4-.6l.7-4.1c.1-.3.3-.5.6-.5h.6c.9 0 1.6-.5 1.8-1.4.3-1.1-.2-1.8-1.2-1.8h-1.7c-1 0-1.9.5-2.2 1.4l-1.3 4.8c-.1.3-.3.5-.6.5h-1.9c-.3 0-.5-.2-.4-.6l2.1-7.8z" fill="#009cde"/></svg>,
  Amex: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="#006FCF"/><text x="24" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">AMEX</text></svg>,
  Visa: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="white" stroke="#E0E0E0"/><path d="M18.8 9.2l-3.2 8.4h2.2l.6-1.8h2.9l.4 1.8h2.1l-3.2-8.4h-1.8zm-1 5.3l.8-2.6.9 2.6h-1.7zM24.2 9.2l-1.5 8.4h2l1.5-8.4h-2zM28.4 9.2c-.4 0-.8.1-1.1.2l.3 1.3c.3-.1.6-.2.9-.2.5 0 .8.2.8.6 0 .3-.2.4-.7.6l-1.1.4c-1 .4-1.6.9-1.6 1.9 0 .8.6 1.4 1.7 1.4.4 0 .9-.1 1.2-.3l-.3-1.3c-.3.1-.6.2-.9.2-.5 0-.8-.2-.8-.6 0-.3.2-.4.7-.6l1.1-.4c1-.4 1.6-.9 1.6-1.9-.1-1-.8-1.5-1.9-1.5zM35.6 13.4c0-2.2-1.3-2.6-2.6-2.6-.7 0-1.3.2-1.8.5l.4 1.3c.4-.2.9-.4 1.3-.4.6 0 1 .2 1 .7 0 .6-.7.7-1.2.7h-.6c-1.3 0-2.4.5-2.4 1.8 0 .8.6 1.3 1.5 1.3.9 0 1.5-.4 1.7-1h-1.1v-1h2.5c.1.6.1 1 .1 1.2.1 1-1.3 1.8-2.8 1.8-1.9 0-3.2-1.2-3.2-3.1 0-1.7 1.1-3.1 3-3.1 1.7 0 2.8.9 2.8 2.7v.4h-2.5z" fill="#1A1F71"/></svg>,
  Mastercard: () => <svg width="48" height="30" viewBox="0 0 48 30" fill="none"><rect width="48" height="30" rx="4" fill="white" stroke="#E0E0E0"/><circle cx="20" cy="15" r="7" fill="#FF5F00"/><circle cx="28" cy="15" r="7" fill="#EB001B" fillOpacity="0.8"/></svg>,
};

const paymentMethods = [
  { name: 'Flying Blue', component: PaymentIcons.FlyingBlue },
  { name: 'Alipay', component: PaymentIcons.Alipay },
  { name: 'G Pay', component: PaymentIcons.GPay },
  { name: 'Apple Pay', component: PaymentIcons.ApplePay },
  { name: 'PayPal', component: PaymentIcons.PayPal },
  { name: 'Amex', component: PaymentIcons.Amex },
  { name: 'Visa', component: PaymentIcons.Visa },
  { name: 'Mastercard', component: PaymentIcons.Mastercard },
];


export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-6 lg:px-8">
        
        {/* --- Top Section: Links & Main Info --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 py-16">

          {/* Column 1: Brand & Trust */}
          <div className="lg:col-span-2">
            <a href="/" className="inline-block mb-6">
              <div className="bg-red-600 text-white p-4 w-48 text-center rounded-lg shadow-md">
                <span className="font-bold text-xl leading-tight block tracking-wide">EGYPT</span>
                <span className="font-semibold text-lg leading-tight block">EXCURSIONS</span>
                <span className="text-sm leading-tight block opacity-90">ONLINE</span>
              </div>
            </a>
            <p className="text-slate-600 max-w-sm text-sm leading-relaxed mb-8">
              Book your adventure, skip the lines. Unforgettable tours, tickets, and activities for a memorable journey through Egypt.
            </p>
            <div>
              <p className="font-bold text-slate-800 mb-2">Trusted by our clients</p>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-extrabold text-slate-900">4.2</span>
                <div className="flex flex-col">
                  <div className="flex">
                    {[...Array(4)].map((_, i) => <Star key={i} className="text-red-500 h-5 w-5" fill="currentColor" />)}
                    <Star className="text-slate-300 h-5 w-5" fill="currentColor" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Average rating from Tripadvisor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Columns 2, 3, 4: Dynamic Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold text-md text-slate-900 mb-5 uppercase tracking-wider">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-600 hover:text-red-600 hover:underline transition-colors duration-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* --- Middle Section: Contact & Newsletter --- */}
        <div className="border-t border-slate-200 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Contact Information */}
            <div>
              <h3 className="font-bold text-md text-slate-900 mb-5 uppercase tracking-wider">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Phone size={20} className="text-red-600 flex-shrink-0 mt-1"/>
                  <div>
                    <span className="block text-slate-800 font-semibold">+20 11 42222920</span>
                    <span className="text-xs text-slate-500">From 8:30 - 17:00 EET/EST</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail size={20} className="text-red-600 flex-shrink-0 mt-1"/>
                  <div>
                    <a href="mailto:hello@egypt-excursions-online.com" className="block text-blue-600 hover:underline">hello@egypt-excursions-online.com</a>
                    <span className="text-xs text-slate-500">We'll reply within 2 working days</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <MessageSquare size={20} className="text-red-600 flex-shrink-0"/>
                  <a href="#" className="hover:underline text-slate-700 font-medium">Chat with us</a>
                </div>
              </div>
            </div>

            {/* Newsletter & Social */}
            <div className="space-y-8">
               <div>
                  <h4 className="font-bold text-sm mb-3 text-slate-900 uppercase tracking-wider">Sign up for our newsletter</h4>
                  <form className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="email" 
                      placeholder="Your email address"
                      className="flex-grow px-4 py-2.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-shadow"
                      aria-label="Email address for newsletter"
                    />
                    <button type="submit" className="px-6 py-2.5 bg-slate-800 text-white rounded-md text-sm font-semibold hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 transition-colors">
                      SUBSCRIBE
                    </button>
                  </form>
               </div>
               <div>
                  <h4 className="font-bold text-sm mb-3 text-slate-900 uppercase tracking-wider">Follow us</h4>
                  <div className="flex gap-3">
                    {socialLinks.map((link) => (
                      <a key={link.label} href={link.href} aria-label={link.label} className="w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all duration-300 transform hover:scale-110">
                        <link.icon size={20} />
                      </a>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* --- Bottom Section: Payments & Copyright --- */}
        <div className="border-t border-slate-200 py-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Payment Methods */}
                <div className='text-center lg:text-left'>
                    <h3 className="font-bold text-md mb-4 text-slate-900 uppercase tracking-wider">Ways You Can Pay</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {paymentMethods.map((method) => (
                        <div key={method.name} title={method.name} className="flex items-center justify-center p-1 bg-white border border-slate-200 rounded-md transition-transform hover:-translate-y-1 hover:shadow-lg">
                            <method.component />
                        </div>
                        ))}
                    </div>
                </div>
                {/* Copyright & Legal */}
                <div className="text-center lg:text-right text-sm text-slate-500">
                    <p>&copy; {new Date().getFullYear()} Egypt Excursions Online. All rights reserved.</p>
                    <div className="mt-2 space-x-4">
                        <a href="#" className="hover:underline">Privacy Policy</a>
                        <span>&middot;</span>
                        <a href="#" className="hover:underline">Terms and Conditions</a>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </footer>
  );
}