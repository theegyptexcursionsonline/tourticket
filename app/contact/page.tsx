import React from 'react';
import { Metadata } from 'next';
import ContactClientPage from './ContactClientPage';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch | Egypt Excursions Online',
  description: 'Have a question? Contact Egypt Excursions Online. We are here to help you plan your perfect Egyptian adventure. 24/7 support available.',
  openGraph: {
    title: 'Contact Us | Egypt Excursions Online',
    description: 'Have a question? Contact us for 24/7 support and expert travel advice.',
    type: 'website',
    images: ['/about.png'],
  },
};

export default function ContactPage() {
  return <ContactClientPage />;
}
