import { Metadata } from 'next';
import FAQsClientPage from './FAQsClientPage';
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';

export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

const PAGE_METADATA: Metadata = {
  title: 'Frequently Asked Questions | Egypt Excursions Online',
  description: 'Find answers to common questions about booking tours, cancellations, payments, and travel tips for Egypt excursions.',
  openGraph: {
    title: 'FAQs | Egypt Excursions Online',
    description: 'Answers to common questions about booking tours and excursions in Egypt.',
    type: 'website',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  await params;
  return { ...PAGE_METADATA, alternates: englishOnlyMetadataAlternates('/faqs') };
}

export default function FAQsPage() {
  return <FAQsClientPage />;
}
