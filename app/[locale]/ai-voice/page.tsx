import { Metadata } from 'next';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VoicePageContent from './VoicePageContent';
import { requireRouteLocale } from '@/lib/i18n/routeLocale';

export const revalidate = 1800;

type VoiceMeta = { title: string; description: string; ogTitle: string; ogDescription: string };

// Each language gets its own title and description; Arabic pages used to carry
// the English ones in the browser tab and in search results.
const META: Record<string, VoiceMeta> = {
  en: {
    title: 'AI Voice Concierge — Talk to Nile | Egypt Excursions Online',
    description:
      'Explore Egypt tours with Nile by voice or text. Choose an available language in the assistant and confirm prices and availability when booking.',
    ogTitle: 'AI Voice Concierge | Egypt Excursions Online',
    ogDescription: 'Ask about Egypt tours by voice or text, using the languages available in the assistant.',
  },
  ar: {
    title: 'المساعد الصوتي — تحدث مع نايل | Egypt Excursions Online',
    description:
      'استكشف رحلات مصر مع نايل بالصوت أو بالكتابة. اختر لغة متاحة في المساعد وتأكد من الأسعار والتوافر عند الحجز.',
    ogTitle: 'المساعد الصوتي | Egypt Excursions Online',
    ogDescription: 'اسأل عن رحلات مصر بالصوت أو بالكتابة، باللغات المتاحة في المساعد.',
  },
  de: {
    title: 'KI-Sprachassistent — Sprechen Sie mit Nile | Egypt Excursions Online',
    description:
      'Entdecken Sie Ägypten-Touren mit Nile per Sprache oder Text. Wählen Sie im Assistenten eine verfügbare Sprache und prüfen Sie Preise und Verfügbarkeit bei der Buchung.',
    ogTitle: 'KI-Sprachassistent | Egypt Excursions Online',
    ogDescription: 'Fragen Sie per Sprache oder Text nach Ägypten-Touren, in den Sprachen des Assistenten.',
  },
  fr: {
    title: 'Concierge vocal IA — Parlez à Nile | Egypt Excursions Online',
    description:
      'Découvrez les excursions en Égypte avec Nile, à la voix ou par écrit. Choisissez une langue disponible et confirmez prix et disponibilités lors de la réservation.',
    ogTitle: 'Concierge vocal IA | Egypt Excursions Online',
    ogDescription: 'Posez vos questions sur les excursions en Égypte à la voix ou par écrit, dans les langues de l’assistant.',
  },
  es: {
    title: 'Conserje de voz con IA — Habla con Nile | Egypt Excursions Online',
    description:
      'Explora excursiones por Egipto con Nile por voz o texto. Elige un idioma disponible en el asistente y confirma precios y disponibilidad al reservar.',
    ogTitle: 'Conserje de voz con IA | Egypt Excursions Online',
    ogDescription: 'Pregunta por excursiones en Egipto por voz o texto, en los idiomas disponibles del asistente.',
  },
};

function voicePageMeta(locale: string): VoiceMeta {
  return META[locale] ?? META.en;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Probes such as /wp-good.php reach here with a fake locale: answer 404, not a server error.
  requireRouteLocale(locale);
  const meta = voicePageMeta(locale);
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.ogTitle,
      description: meta.ogDescription,
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
