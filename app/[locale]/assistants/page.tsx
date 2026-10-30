import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AssistantsClient from './AssistantsClient';

// Customer-facing showcase for the three hosted travel assistants. It stays out
// of search indexes because the booking card runs the Foxes sample catalogue:
// its "Reserve now" makes a real (unpaid) reservation with the demo business.
export const metadata: Metadata = {
  title: 'Travel Assistants | Egypt Excursions Online',
  description: 'Search Egypt tours with AI, open the voice concierge, or try the booking widget with sample experiences.',
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
