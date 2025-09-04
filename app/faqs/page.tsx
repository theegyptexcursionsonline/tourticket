'use client';

import React from "react";
import { 
  Facebook, Instagram, Twitter, Youtube, Phone, Mail, MessageSquare, 
  Menu, Search, ChevronDown, Plus, Minus
} from "lucide-react";
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
// --- FAQs PAGE COMPONENT ---
// =================================================================
export default function FAQsPage() {
  const faqs = [
    {
      question: "How do I book a tour or ticket?",
      answer: "You can easily book a tour or ticket directly on our website. Simply find the activity you want, choose your date and time, and follow the steps to complete your booking. You'll receive a mobile ticket via email that you can show on your smartphone."
    },
    {
      question: "Can I cancel or reschedule my tickets?",
      answer: "Yes, you can cancel most tickets for free up to 8 hours before the scheduled activity time. To reschedule, you'll need to cancel your original booking and make a new one. Please check the specific policy for your chosen activity."
    },
    {
      question: "Are tickets refundable?",
      answer: "Refund policies vary by tour. Most of our tickets are fully refundable if canceled within the free cancellation window. The specific refund details are listed on each product page and in your booking confirmation."
    },
    {
      question: "What languages do the tour guides speak?",
      answer: "Our tour guides are knowledgeable and multilingual. The languages offered for a specific tour are listed on the tour's product page. English is available on all tours, with many also offering Spanish, French, German, and more."
    },
    {
      question: "Do I need to print my ticket?",
      answer: "No, you don't! Our tickets are mobile-friendly. You can simply show the e-ticket on your smartphone to the tour guide or at the entrance. This makes your experience smooth and hassle-free."
    },
    {
      question: "What if my tour is canceled by the provider?",
      answer: "In the rare event that a tour is canceled by the provider, we will notify you immediately and provide a full refund. We will also help you find a suitable alternative for your trip."
    },
  ];

  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Find answers to the most common questions about our tours and services.
            </p>
          </section>

          <section className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group border-b border-slate-200 py-4 cursor-pointer transition-all duration-300"
              >
                <summary className="flex justify-between items-center list-none outline-none">
                  <h3 className="text-lg font-semibold text-slate-800 group-hover:text-red-600 transition-colors">
                    {faq.question}
                  </h3>
                  <Plus 
                    size={24} 
                    className="text-slate-500 group-hover:text-red-600 transition-transform transform group-open:rotate-45" 
                  />
                </summary>
                <div className="pt-4 text-slate-600 leading-relaxed transition-all duration-300">
                  {faq.answer}
                </div>
              </details>
            ))}
          </section>

          <section className="text-center mt-12">
            <p className="text-lg text-slate-700">
              Still have questions? Our team is here to help.
            </p>
            <a 
              href="/contact" 
              className="mt-4 inline-block px-8 py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors"
            >
              Contact Us
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}