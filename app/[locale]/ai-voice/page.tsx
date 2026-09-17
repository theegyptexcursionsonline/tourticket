import { Metadata } from 'next';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VoicePageContent from './VoicePageContent';

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'AI Voice Concierge — Talk to Nile | Egypt Excursions Online',
    description:
      'Speak with Nile, our AI voice concierge, about Egypt tours, availability, prices, and bookings — in English or Arabic, any time.',
    openGraph: {
      title: 'AI Voice Concierge | Egypt Excursions Online',
      description: 'Ask about Egypt tours out loud — grounded answers from the real catalog, in English or Arabic.',
      type: 'website',
    },
    alternates: metadataAlternates(locale, '/ai-voice'),
  };
}

export default async function AIVoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <>
      <Header />
      <VoicePageContent locale={locale} />
      <Footer />
    </>
  );
}
