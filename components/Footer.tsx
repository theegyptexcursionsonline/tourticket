import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare } from 'lucide-react';

const socialLinks = [
  { icon: Facebook, href: '#' },
  { icon: Instagram, href: '#' },
  { icon: Twitter, href: '#' },
  { icon: Youtube, href: '#' },
];

const paymentMethods = [
    { name: 'Flying Blue', src: '/payment-flyingblue.svg' },
    { name: 'Alipay', src: '/payment-alipay.svg' },
    { name: 'G Pay', src: '/payment-gpay.svg' },
    { name: 'Apple Pay', src: '/payment-applepay.svg' },
    { name: 'Paypal', src: '/payment-paypal.svg' },
    { name: 'Amex', src: '/payment-amex.svg' },
    { name: 'Visa', src: '/payment-visa.svg' },
];


export default function Footer() {
  return (
    <footer className="bg-slate-100 text-slate-700 pt-16 pb-8">
      <div className="container mx-auto px-4">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8 mb-12">
          {/* Logo */}
          <div className="lg:col-span-2 xl:col-span-1 mb-6 md:mb-0">
            <div className="bg-red-500 text-white font-bold text-2xl p-4 inline-block">
                <span>TRIP</span>
                <span className="text-cyan-300">&</span>
                <span>TICKETS</span>
            </div>
          </div>

          {/* Link Sections */}
          <div className="xl:col-start-3">
            <h3 className="font-bold text-lg mb-4 text-slate-900">Destinations</h3>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-red-500 transition-colors">Amsterdam</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Berlin</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Copenhagen</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Rotterdam</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Stockholm</a></li>
            </ul>
          </div>

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
          
          {/* Contact and Social */}
          <div className="lg:col-span-2">
             <h3 className="font-bold text-lg mb-4 text-slate-900">Contact information</h3>
             <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3"><Phone size={20} className="text-red-500"/> <span>+31 (0)20 420 4000</span></li>
                <li className="flex items-center gap-3"><Mail size={20} className="text-red-500"/> <span>hello@toursandtickets.nl</span></li>
                <li className="flex items-center gap-3"><MessageSquare size={20} className="text-red-500"/> <span>Chat with us</span></li>
             </ul>
             
             <h3 className="font-bold text-lg mb-4 text-slate-900">Follow us on social media</h3>
             <div className="flex gap-4">
                {socialLinks.map((link, index) => (
                    <a key={index} href={link.href} className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">
                        <link.icon size={20} />
                    </a>
                ))}
             </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-300 pt-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
                <p className="font-semibold text-slate-900">Trusted by our clients</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold text-slate-900">4.2</span>
                    <div className="flex">
                        {[...Array(4)].map((_, i) => <span key={i} className="text-red-500 text-2xl">★</span>)}
                        <span className="text-slate-300 text-2xl">★</span>
                    </div>
                </div>
                <p className="text-sm text-slate-500">Average rating from Tripadvisor</p>
            </div>
            
            <div className="w-full md:w-auto">
                <h3 className="font-bold text-lg mb-4 text-slate-900 text-center md:text-left">Ways you can pay</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                    {paymentMethods.map(method => (
                        <div key={method.name} className="bg-white border border-slate-200 rounded-md px-3 py-1 flex items-center justify-center h-8">
                           {/* Using text as placeholder for logos */}
                           <span className="text-xs font-semibold text-slate-600">{method.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </footer>
  );
}
