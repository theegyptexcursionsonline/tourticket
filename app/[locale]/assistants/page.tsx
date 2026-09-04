import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AssistantsClient from './AssistantsClient';

// Customer-facing showcase for the three hosted travel assistants. It remains
// out of search indexes while Booking is intentionally in no-payment preview.
export const metadata: Metadata = {
  title: 'Travel Assistants | Egypt Excursions Online',
  description: 'Search Egypt tours with AI, open the voice concierge, or preview the guided booking assistant.',
  robots: { index: false, follow: false },
};

export default function AssistantsPage() {
  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <AssistantsClient />
      </main>
      <Footer />
    </>
  );
}
