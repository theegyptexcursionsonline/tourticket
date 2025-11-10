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
// --- PRIVACY POLICY PAGE COMPONENT ---
// =================================================================
export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white text-slate-800 min-h-screen flex flex-col">
      <DarkHero />
      <Header />

      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2">
              Privacy Policy
            </h1>
            <p className="text-slate-600">
              Effective Date: September 4, 2025
            </p>
          </section>

          <section className="prose prose-lg mx-auto text-slate-700">
            <p>
              This Privacy Policy describes how Egypt Excursions Online collects, uses, and protects your personal information when you use our website and services.
            </p>

            <h2>1. Information We Collect</h2>
            <p>
              We collect information that you provide directly to us when you make a booking, create an account, or contact us. This may include:
            </p>
            <ul>
              <li><strong>Personal Identification Information:</strong> Name, email address, phone number, and billing information.</li>
              <li><strong>Booking Information:</strong> Details of your tour bookings, payment history, and preferences.</li>
              <li><strong>Communication Data:</strong> Records of your correspondence with our customer support team.</li>
            </ul>
            <p>
              We also automatically collect certain information when you visit our Site, such as your IP address, browser type, device information, and usage data (e.g., pages visited, time spent on the Site).
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>
              We use the information we collect for various purposes, including:
            </p>
            <ul>
              <li>To <strong>process and fulfill your bookings</strong> and transactions.</li>
              <li>To <strong>communicate with you</strong> about your bookings, updates, or special offers.</li>
              <li>To <strong>improve our website and services</strong>, including personalizing your experience.</li>
              <li>To <strong>analyze usage trends</strong> and user behavior to enhance functionality.</li>
              <li>To <strong>protect against fraud</strong> and ensure the security of our platform.</li>
            </ul>

            <h2>3. Sharing Your Information</h2>
            <p>
              We may share your personal information with third parties only when necessary to provide our services. This includes:
            </p>
            <ul>
              <li><strong>Tour Operators:</strong> We share relevant booking details (e.g., your name) with the tour providers to confirm your reservation.</li>
              <li><strong>Payment Processors:</strong> Your billing information is shared with secure third-party payment gateways to process transactions.</li>
              <li><strong>Legal and Compliance:</strong> We may disclose your information if required by law or to protect our rights and safety.</li>
            </ul>
            <p>
              We do not sell your personal information to third parties for their own marketing purposes.
            </p>

            <h2>4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet is 100% secure.
            </p>

            <h2>5. Your Rights and Choices</h2>
            <p>
              You have the right to access, update, or request the deletion of your personal information. You can also opt out of receiving marketing communications from us at any time.
            </p>

            <h2>6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can manage your cookie preferences through your browser settings.
            </p>

            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Effective Date."
            </p>

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <p>
              booking@egypt-excursionsonline.com
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}