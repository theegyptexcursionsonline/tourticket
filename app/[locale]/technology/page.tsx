import { Metadata } from 'next';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TechnologyPageContent from './TechnologyPageContent';

export const revalidate = 1800;

const META: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Technology | Egypt Excursions Online',
    description:
      'AI voice concierge, AI trip search, online booking with secure checkout and mobile apps — what Egypt Excursions Online technology does today, with live status.',
  },
  ar: {
    title: 'التقنية | Egypt Excursions Online',
    description:
      'مساعد صوتي بالذكاء الاصطناعي، بحث ذكي للرحلات، حجز إلكتروني بدفع آمن وتطبيقات جوال — ما تقدمه تقنية Egypt Excursions Online اليوم مع الحالة المباشرة.',
  },
  de: {
    title: 'Technologie | Egypt Excursions Online',
    description:
      'KI-Sprachassistent, KI-Reisesuche, Online-Buchung mit sicherer Zahlung und mobile Apps — was die Technologie von Egypt Excursions Online heute leistet, mit Live-Status.',
  },
  fr: {
    title: 'Technologie | Egypt Excursions Online',
    description:
      'Concierge vocal IA, recherche voyage IA, réservation en ligne avec paiement sécurisé et applications mobiles — ce que fait la technologie d’Egypt Excursions Online aujourd’hui, avec l’état en direct.',
  },
  es: {
    title: 'Tecnología | Egypt Excursions Online',
    description:
      'Conserje de voz con IA, búsqueda de viajes con IA, reserva online con pago seguro y apps móviles — lo que hace hoy la tecnología de Egypt Excursions Online, con estado en directo.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = META[locale] || META.en;
  return {
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description, type: 'website' },
    alternates: metadataAlternates(locale, '/technology'),
  };
}

export default async function TechnologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <>
      <Header />
      <TechnologyPageContent locale={locale} />
      <Footer />
    </>
  );
}
