import { Metadata } from 'next';
import FAQsClientPage from './FAQsClientPage';
import { getSeoAlternates } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Egypt Excursions Online',
  description: 'Find answers to common questions about booking tours, cancellations, payments, and travel tips for Egypt excursions.',
  openGraph: {
    title: 'FAQs | Egypt Excursions Online',
    description: 'Answers to common questions about booking tours and excursions in Egypt.',
    type: 'website',
  },
  alternates: getSeoAlternates('/faqs'),
};

export default function FAQsPage() {
  return <FAQsClientPage />;
}
