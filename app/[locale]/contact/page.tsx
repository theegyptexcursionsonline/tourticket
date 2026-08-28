import React from 'react';
import { Metadata } from 'next';
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';
import ContactClientPage from './ContactClientPage';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import WebSiteSchema from '@/components/schema/WebSiteSchema';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

// Generate metadata for SEO
const PAGE_METADATA: Metadata = {
  title: 'Contact Us - Get in Touch | Egypt Excursions Online',
  description: 'Have a question? Contact Egypt Excursions Online. We are here to help you plan your perfect Egyptian adventure. 24/7 support available.',
  openGraph: {
    title: 'Contact Us | Egypt Excursions Online',
    description: 'Have a question? Contact us for 24/7 support and expert travel advice.',
    type: 'website',
    images: ['https://egypt-excursionsonline.com/about.png'],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  await params;
  return { ...PAGE_METADATA, alternates: englishOnlyMetadataAlternates('/contact') };
}

export default function ContactPage() {
  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema
        locale="en"
        pageName="Get in Touch"
        pageDescription="Have a question? We're here to help you plan your perfect Egyptian adventure."
        pageUrl="/contact"
      />
      <ContactClientPage />
    </>
  );
}
