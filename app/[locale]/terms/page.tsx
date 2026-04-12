import { Metadata } from 'next';
import TermsClientPage from './TermsClientPage';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import { getSeoAlternates } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Terms & Conditions | Egypt Excursions Online',
  description: 'Read the terms and conditions for using Egypt Excursions Online. Book with confidence knowing your rights and responsibilities.',
  openGraph: {
    title: 'Terms & Conditions | Egypt Excursions Online',
    description: 'Terms and conditions for booking tours and excursions with Egypt Excursions Online.',
    type: 'website',
  },
  alternates: getSeoAlternates('/terms'),
};

export default function TermsPage() {
  return (
    <>
      <WebSiteSchema pageName="Terms & Conditions" />
      <TermsClientPage />
    </>
  );
}
