import { Metadata } from 'next';
import TermsClientPage from './TermsClientPage';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';

export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

const PAGE_METADATA: Metadata = {
  title: 'Terms & Conditions | Egypt Excursions Online',
  description: 'Read the terms and conditions for using Egypt Excursions Online. Book with confidence knowing your rights and responsibilities.',
  openGraph: {
    title: 'Terms & Conditions | Egypt Excursions Online',
    description: 'Terms and conditions for booking tours and excursions with Egypt Excursions Online.',
    type: 'website',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  await params;
  return { ...PAGE_METADATA, alternates: englishOnlyMetadataAlternates('/terms') };
}

export default function TermsPage() {
  return (
    <>
      <WebSiteSchema locale="en" pageName="Terms of Service" pageUrl="/terms" />
      <TermsClientPage />
    </>
  );
}
