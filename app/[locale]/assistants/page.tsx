import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AssistantsClient from './AssistantsClient';

// Direct-access verification surface for the conversational assistants; kept
// out of navigation and search indexes until launch.
export const metadata: Metadata = {
  title: 'Assistants | Egypt Excursions Online',
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
