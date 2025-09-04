'use client';

import React from "react";
import { 
  Menu, Search, ChevronDown
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
// --- TERMS AND CONDITIONS PAGE COMPONENT ---
// =================================================================
export default function TermsAndConditionsPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">
              Terms and Conditions
            </h1>
            <p className="text-slate-600">
              Effective Date: September 4, 2025
            </p>
          </section>

          <section className="prose prose-lg mx-auto text-slate-700">
            <p>
              <strong>Disclaimer:</strong> The following terms and conditions are provided for informational and structural purposes only. They are not legal advice. You must consult with a qualified legal professional to draft terms and conditions that are appropriate for your business.
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using this website ("Site") or any of our services ("Services"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our Site or Services. These Terms govern your use of the Site and all content, services, and products available through the Site.
            </p>

            <h2>2. Use of the Site and Services</h2>
            <p>
              Egypt Excursions Online provides a platform for booking tours, activities, and tickets. The use of this Site is subject to all applicable local, national, and international laws and regulations. You agree to use the Site only for lawful purposes. You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device.
            </p>
            <ul>
              <li>You must be at least 18 years old to use our services.</li>
              <li>You agree to provide accurate, current, and complete information when making a booking.</li>
              <li>You agree not to use the Site to engage in any fraudulent, illegal, or unauthorized activity.</li>
            </ul>

            <h2>3. Booking and Payments</h2>
            <p>
              All bookings are subject to availability and confirmation. Prices are as displayed on the Site and may be subject to change without notice. When you make a booking, you authorize Egypt Excursions Online to charge the provided payment method for the total amount of the booking.
            </p>
            <ul>
              <li><strong>Payment:</strong> Payments can be made via the methods listed on the Site (e.g., Visa, MasterCard, PayPal).</li>
              <li><strong>Confirmation:</strong> You will receive a confirmation email with your mobile tickets after a successful booking.</li>
              <li><strong>Pricing:</strong> Prices include all applicable taxes unless otherwise stated.</li>
            </ul>

            <h2>4. Cancellations and Refunds</h2>
            <p>
              Cancellations and refund policies vary by tour and are clearly stated on each product page. Free cancellation is available for most products up to a specified time before the tour date. You must follow the instructions in your confirmation email to initiate a cancellation.
            </p>

            <h2>5. Intellectual Property</h2>
            <p>
              All content on this Site, including text, graphics, logos, images, and software, is the property of Egypt Excursions Online or its content suppliers and is protected by copyright and intellectual property laws. You may not reproduce, modify, distribute, or otherwise use any content without our prior written consent.
            </p>

            <h2>6. Limitation of Liability</h2>
            <p>
              Egypt Excursions Online acts as a booking agent for third-party tour operators and is not responsible for the acts, errors, omissions, representations, warranties, breaches, or negligence of any such suppliers. In no event shall Egypt Excursions Online be liable for any direct, indirect, punitive, incidental, or consequential damages arising out of your use of this Site or Services.
            </p>

            <h2>7. Governing Law</h2>
            <p>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which Egypt Excursions Online is registered, without regard to its conflict of law principles.
            </p>

            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <p>
              hello@egyptexcursionsonline.com
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}