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
      'Explore Egypt tours with Nile by voice or text. Choose an available language in the assistant and confirm prices and availability when booking.',
    openGraph: {
      title: 'AI Voice Concierge | Egypt Excursions Online',
      description: 'Ask about Egypt tours by voice or text, using the languages available in the assistant.',
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
