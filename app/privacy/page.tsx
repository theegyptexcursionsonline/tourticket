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
              Last updated: 12 November 2025
            </p>
          </section>

          <section className="prose prose-lg mx-auto text-slate-700">
            <div className="mb-6">
              <p className="font-semibold">Company name: Egypt Excursions Online</p>
              <p className="font-semibold">Mother company: Excursions Online LLC FZ</p>
              <p className="font-semibold">Official email: info@egypt-excursionsonline.com</p>
              <p className="font-semibold">Website: https://www.egypt-excursionsonline.com</p>
            </div>

            <h2>1. Who we are</h2>
            <p>
              This Privacy Policy explains how Egypt Excursions Online (operated by Excursions Online LLC FZ) collects, uses, shares, and protects personal data when you visit our website or book our tours and related services (the "Service").
            </p>

            <h2>2. Scope</h2>
            <p>
              This Policy applies to visitors and customers who access or use the Service, contact us by email/phone/WhatsApp, or interact with our social channels. By using the Service, you agree to the practices described here.
            </p>

            <h2>3. What data we collect</h2>
            <p>
              We collect the following categories of personal data when necessary for the purposes described in Section 4:
            </p>
            <ul>
              <li><strong>Identification & contact data:</strong> name, email, phone number, country, hotel/accommodation, room number (where relevant).</li>
              <li><strong>Booking details:</strong> travel dates, party size, special requests, pickup/dropoff locations, preferred languages.</li>
              <li><strong>Government ID (where required):</strong> passport number/copy for certain private tours or as required by checkpoints/security regulations.</li>
              <li><strong>Payment & billing data:</strong> billing address, payment method details (processed by third-party providers; we do not store full card numbers).</li>
              <li><strong>Communications:</strong> emails, messages, call notes, and feedback.</li>
              <li><strong>Device & usage data:</strong> IP address, device identifiers, browser type, pages viewed, and interaction data (via cookies and similar technologies).</li>
            </ul>

            <h2>4. Why we use your data (legal bases)</h2>
            <p>We process personal data for:</p>
            <ul>
              <li><strong>Booking & operations (Contract):</strong> to confirm bookings, issue vouchers, coordinate pickups, and provide customer support.</li>
              <li><strong>Safety & compliance (Legal obligation/Legitimate interests):</strong> to meet legal, tax, accounting, and security requirements (e.g., passport checks, police checkpoints).</li>
              <li><strong>Service improvement & analytics (Legitimate interests/Consent):</strong> to monitor performance, troubleshoot, and enhance user experience.</li>
              <li><strong>Marketing (Consent/Legitimate interests):</strong> to send offers and updates; you may opt out anytime.</li>
            </ul>

            <h2>5. Cookies and similar technologies</h2>
            <p>
              We use cookies and similar technologies to operate the Service, remember preferences, and perform analytics. Where required, we will request consent. You can manage cookie preferences in your browser settings; some features may not function without certain cookies.
            </p>

            <h2>6. Analytics and measurement</h2>
            <p>
              We may use third-party analytics tools (e.g., Google Analytics, ad platforms) to understand usage and performance. These providers process limited data on our behalf under their own privacy terms. We configure dashboards, conversion tracking, and goals/events to measure leads, bookings, and key actions.
            </p>

            <h2>7. Sharing your data</h2>
            <p>We share personal data only as needed with:</p>
            <ul>
              <li>Local suppliers/operators, guides, and drivers to deliver the booked services.</li>
              <li>Payment processors and banks to take payments and prevent fraud.</li>
              <li>IT/service providers (hosting, email, CRM, analytics) under contractual obligations.</li>
              <li>Authorities where legally required (e.g., security checkpoints, law enforcement).</li>
              <li>Business transfers (e.g., merger or acquisition) with appropriate safeguards.</li>
            </ul>
            <p>We do not sell personal data.</p>

            <h2>8. International transfers</h2>
            <p>
              Data may be processed in countries outside your residence. Where required, we implement safeguards such as contractual clauses to protect your data.
            </p>

            <h2>9. Data retention</h2>
            <p>
              We retain personal data only for as long as necessary for the purposes described, including legal, accounting, or reporting requirements. Typical retention: booking records and invoices for statutory periods; support communications for operational needs.
            </p>

            <h2>10. Your choices and rights</h2>
            <p>
              Depending on your location, you may have rights to access, correct, delete, object to, or restrict processing of your personal data, and to withdraw consent where processing is based on consent. To exercise these rights, contact info@egypt-excursionsonline.com.
            </p>

            <h2>11. Security</h2>
            <p>
              We implement administrative, technical, and physical safeguards intended to protect personal data. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
            </p>

            <h2>12. Children</h2>
            <p>
              The Service is intended for individuals 18+. We do not knowingly collect data from children under 18. If you believe a child has provided us data, contact us to request deletion.
            </p>

            <h2>13. Third-party links</h2>
            <p>
              Our site may contain links to third-party websites or services. We are not responsible for their privacy practices. Review their policies before providing personal data.
            </p>

            <h2>14. Changes to this Policy</h2>
            <p>
              We may update this Policy from time to time. We will post the updated version with a new effective date. Your continued use of the Service signifies acceptance of the updated Policy.
            </p>

            <h2>15. Contact</h2>
            <p>
              For questions or privacy requests, contact: info@egypt-excursionsonline.com.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}