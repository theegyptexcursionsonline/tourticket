'use client';

import React, { useState } from "react";
import { Phone, Mail, MessageSquare, Facebook, Instagram, Twitter, Youtube, Loader2, MapPin, Clock, Send } from "lucide-react";
import Image from "next/image";
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// Reusable Header and Footer components
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// =================================================================
// --- MODERN HERO SECTION COMPONENT ---
// =================================================================
function ModernHero() {
  return (
    <div className="relative h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 flex items-center justify-center text-white text-center px-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src="/about.png"
          alt="Contact us background"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-red-900/80" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="inline-block mb-4"
        >
          <span className="px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full text-sm font-medium backdrop-blur-sm">
            24/7 Support Available
          </span>
        </motion.div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
          Get in <span className="text-red-500">Touch</span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl max-w-2xl mx-auto opacity-90 leading-relaxed">
          Have a question? We're here to help you plan your perfect Egyptian adventure. 
          Our travel experts are ready to assist you.
        </p>
      </motion.div>

      {/* Decorative bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

// =================================================================
// --- CONTACT US PAGE COMPONENT ---
// =================================================================
export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const socialLinks = [
    { icon: Facebook, href: "#" },
    { icon: Instagram, href: "#" },
    { icon: Twitter, href: "#" },
    { icon: Youtube, href: "#" },
  ];

  const openChatbot = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-chatbot'));
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill out all fields.');
      return;
    }
    
    setIsLoading(true);
    const toastId = toast.loading('Sending your message...');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }
      
      toast.success('Message sent successfully!', { id: toastId });
      setFormData({ name: '', email: '', message: '' }); // Reset form

    } catch (error: any) {
      toast.error(error.message || 'Failed to send message.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="bg-gradient-to-b from-white to-slate-50 text-slate-800">
      <Toaster position="top-center" />
      <Header startSolid />
      <ModernHero />

      {/* Main Contact Section */}
      <main className="container mx-auto px-4 py-20 -mt-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Quick Contact Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            {/* Phone Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100 group">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition-colors">
                  <Phone size={24} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">Call Us</h3>
                  <a href="tel:+201142255624" className="text-red-600 font-semibold hover:text-red-700 text-lg">
                    +20 11 42255624
                  </a>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock size={12} /> Available 24/7
                  </p>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100 group">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <Mail size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">Email Us</h3>
                  <a 
                    href="mailto:booking@egypt-excursionsonline.com" 
                    className="text-blue-600 font-semibold hover:text-blue-700 text-sm break-all"
                  >
                    booking@egypt-excursionsonline.com
                  </a>
                  <p className="text-xs text-slate-500 mt-1">Reply within 1 hour</p>
                </div>
              </div>
            </div>

            {/* Chat Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-slate-100 group cursor-pointer" onClick={openChatbot}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                  <MessageSquare size={24} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">Live Chat</h3>
                  <p className="text-green-600 font-semibold">Start a conversation</p>
                  <p className="text-xs text-slate-500 mt-1">Instant support</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form - Takes 2 columns */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-10 border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Send size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Send us a Message</h2>
                    <p className="text-slate-600 text-sm">We'll get back to you within 24 hours</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                      Your Message *
                    </label>
                    <textarea
                      id="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us how we can help you..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-14 px-8 rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:from-red-400 disabled:to-red-400 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        Send Message
                        <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    By submitting this form, you agree to our privacy policy and terms of service.
                  </p>
                </form>
              </div>
            </motion.div>

            {/* Sidebar - Additional Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              {/* Office Hours */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Clock size={24} className="text-red-400" />
                  <h3 className="font-bold text-xl">Office Hours</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-300">Monday - Friday</span>
                    <span className="font-semibold">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-slate-300">Saturday</span>
                    <span className="font-semibold">10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-300">Sunday</span>
                    <span className="font-semibold text-red-400">Closed</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <p className="text-xs text-red-200">
                    🌟 Emergency support available 24/7 via phone and chat
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin size={24} className="text-red-600" />
                  <h3 className="font-bold text-xl text-slate-900">Visit Us</h3>
                </div>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Egypt Excursions Online<br />
                  Cairo, Egypt
                </p>
                <p className="text-sm text-slate-500">
                  We're located in the heart of Cairo, ready to help you plan your perfect Egyptian adventure.
                </p>
              </div>

              {/* Social Media */}
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                <h3 className="font-bold text-xl text-slate-900 mb-4">Connect With Us</h3>
                <p className="text-slate-600 text-sm mb-6">Follow us for travel inspiration and updates</p>
                <div className="flex gap-3">
                  {socialLinks.map(({ icon: Icon, href }, i) => (
                    <a
                      key={i}
                      href={href}
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white flex items-center justify-center hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg hover:scale-110 transform"
                      aria-label={`Follow us on ${Icon.displayName || 'social media'}`}
                    >
                      <Icon size={20} />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-20 bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 lg:p-12 border border-red-100"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
              <p className="text-slate-600">Quick answers to common questions</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-2">How quickly will I get a response?</h4>
                <p className="text-slate-600 text-sm">We typically respond to emails within 1 hour during business hours and within 24 hours on weekends.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-2">Can I modify my booking?</h4>
                <p className="text-slate-600 text-sm">Yes! Contact us at least 24 hours before your tour for modifications. Some tours offer free cancellation.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-2">Do you offer group discounts?</h4>
                <p className="text-slate-600 text-sm">Absolutely! We offer special rates for groups of 10 or more. Contact us for a custom quote.</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-2">What payment methods do you accept?</h4>
                <p className="text-slate-600 text-sm">We accept all major credit cards, PayPal, and bank transfers. Payment is secure and encrypted.</p>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}