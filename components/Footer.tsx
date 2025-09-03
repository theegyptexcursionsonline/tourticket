import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare } from 'lucide-react';

const socialLinks = [
  { icon: Facebook, href: '#' },
  { icon: Instagram, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Youtube, href: '#' },
];

// Payment method components with real SVG icons
const PaymentIcons = {
  FlyingBlue: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="#003366"/>
      <text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Flying Blue</text>
    </svg>
  ),
  Alipay: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="#00A1E9"/>
      <text x="20" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">alipay</text>
    </svg>
  ),
  GPay: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0"/>
      <path d="M12 8.5h3.5v7H12v-7zm4.5 0h3v7h-3v-7zm4 0H24v7h-3.5v-7z" fill="#4285F4"/>
      <path d="M25 10.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5z" fill="#EA4335"/>
      <text x="20" y="20" textAnchor="middle" fill="#5f6368" fontSize="6">Pay</text>
    </svg>
  ),
  ApplePay: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="black"/>
      <path d="M16.5 7c.3-.4.5-.9.4-1.4-.4 0-.9.3-1.2.6-.3.4-.5.9-.4 1.4.5 0 .9-.2 1.2-.6z" fill="white"/>
      <path d="M17 7.5c-.7 0-1.2.4-1.5.4s-.9-.4-1.5-.4c-.8 0-1.5.4-1.9 1.1-.8 1.4-.2 3.5.6 4.6.4.5.8 1.1 1.4 1.1.6 0 .8-.4 1.5-.4s.9.4 1.5.4c.6 0 1-.5 1.4-1.1.5-.6.7-1.2.7-1.2s-1.4-.5-1.4-2c0-1.3 1.1-1.9 1.1-1.9-.6-.9-1.5-.9-1.9-.9z" fill="white"/>
      <text x="26" y="16" fill="white" fontSize="6">Pay</text>
    </svg>
  ),
  PayPal: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0"/>
      <path d="M14.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3h-1.5L15 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3h-1.3l-.4 2.8h1.7z" fill="#003087"/>
      <path d="M19.5 7h3.2c1.6 0 2.8 1.2 2.8 2.7 0 1.8-1.5 3.3-3.3 3.3H21L20.3 16h-1.5l1-9zm2.8 4.5c.8 0 1.5-.7 1.5-1.5s-.7-1.3-1.5-1.3H21l-.4 2.8h1.7z" fill="#0070E0"/>
    </svg>
  ),
  Amex: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="#006FCF"/>
      <text x="20" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AMEX</text>
    </svg>
  ),
  Visa: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0"/>
      <path d="M16.3 8.5l-2.8 7h-1.8l-1.4-5.4c-.1-.3-.2-.4-.4-.5-.4-.2-1-.4-1.6-.5l0-.1h2.7c.3 0 .6.2.7.6l.6 3.2 1.5-3.8h1.8l-1.3 0zm4.4 7h-1.7l1.4-7h1.7l-1.4 7zm6.8-7c-.3 0-.6.2-.7.5l-2.5 6.5h-1.8l2.8-7h1.7l.3.8.7-.8h1.8l-1.3 0zm-1.8 1.3l.4-1 .7 2.8-1.1-1.8z" fill="#1A1F71"/>
      <text x="30" y="11" fill="#1A1F71" fontSize="6" fontWeight="bold">VISA</text>
    </svg>
  ),
  Mastercard: () => (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="white" stroke="#dadce0"/>
      <circle cx="16" cy="12" r="6" fill="#FF5F00"/>
      <circle cx="24" cy="12" r="6" fill="#EB001B" fillOpacity="0.8"/>
      <circle cx="24" cy="12" r="6" fill="#F79E1B" fillOpacity="0.6"/>
    </svg>
  )
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
    <footer className="bg-slate-100 text-slate-700 pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          
          {/* Logo Section - Matching the image style */}
        {/* Logo positioned at top-left corner */}
        <div className="mb-8">
          <a href="/" className="inline-block">
            <img
              src="/EEO-logo.png"
              alt="Egypt Excursions Online"
              className="h-16 md:h-20 object-contain"
            />
          </a>
        </div>
        <div>
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Book your adventure, skip the lines. Tours, tickets, and activities for a memorable trip through Egypt.
          </p>
        </div>

          {/* Destinations */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Destinations</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-red-500 transition-colors">Cairo</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Giza</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Luxor</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Aswan</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Alexandria</a></li>
            </ul>
          </div>

          {/* Things to do */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Things to do</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-red-500 transition-colors">Pyramid Tours</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Nile Cruises</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Desert Safari</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Museum Visits</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Red Sea Diving</a></li>
            </ul>
          </div>

          {/* Tours & Tickets */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Tours & Tickets</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-red-500 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">About us</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Careers</a></li>
            </ul>
          </div>
          
          {/* Contact and Newsletter */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-slate-900">Contact information</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3">
                <Phone size={16} className="text-red-500 flex-shrink-0"/> 
                <div>
                  <span className="block">+20 11 42222920</span>
                  <span className="text-xs text-slate-500">From 8:30 - 17:00 EET/EST</span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-red-500 flex-shrink-0"/> 
                <div>
                  <span className="block text-blue-500">hello@EgyptExcursionsOnline.com</span>
                  <span className="text-xs text-slate-500">We'll reply within 5 working days</span>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <MessageSquare size={16} className="text-red-500 flex-shrink-0"/> 
                <span>Chat with us</span>
              </li>
            </ul>
            
            <div className="mb-6">
              <h4 className="font-bold text-sm mb-3 text-slate-900">Sign up for our newsletter here</h4>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-red-500"
                />
                <button className="px-4 py-2 bg-slate-600 text-white rounded-md text-sm hover:bg-red-500 transition-colors">
                  SUBSCRIBE
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm mb-3 text-slate-900">Follow us on social media</h4>
              <div className="flex gap-2">
                {socialLinks.map((link, index) => (
                  <a key={index} href={link.href} className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">
                    <link.icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-300 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Rating Section */}
            <div>
              <p className="font-semibold text-slate-900 mb-2">Trusted by our clients</p>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-slate-900">4.2</span>
                <div className="flex">
                  {[...Array(4)].map((_, i) => (
                    <span key={i} className="text-red-500 text-xl">★</span>
                  ))}
                  <span className="text-slate-300 text-xl">★</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 italic">Average rating from Tripadvisor</p>
            </div>
            
            {/* Payment Methods */}
            <div>
              <h3 className="font-bold text-lg mb-4 text-slate-900">Ways you can pay</h3>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="flex items-center justify-center">
                    <method.component />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-slate-300 text-center">
          <p className="text-sm text-slate-500">
            © 2024 Egypt Excursions Online. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}