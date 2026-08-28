import { Metadata } from 'next';
import PrivacyClientPage from './PrivacyClientPage';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import { englishOnlyMetadataAlternates } from '@/lib/i18n/seoAlternates';

export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

const PAGE_METADATA: Metadata = {
  title: 'Privacy Policy | Egypt Excursions Online',
  description: 'Read the privacy policy for Egypt Excursions Online. We are committed to protecting your personal data and ensuring a safe booking experience.',
  openGraph: {
    title: 'Privacy Policy | Egypt Excursions Online',
    description: 'Our commitment to protecting your personal data and ensuring safe bookings.',
    type: 'website',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  await params;
  return { ...PAGE_METADATA, alternates: englishOnlyMetadataAlternates('/privacy') };
}

export default function PrivacyPage() {
  return (
    <>
      <WebSiteSchema locale="en" pageName="Privacy Policy" pageUrl="/privacy" />
      <PrivacyClientPage />
    </>
  );
}
