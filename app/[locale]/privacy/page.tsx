import { Metadata } from 'next';
import PrivacyClientPage from './PrivacyClientPage';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import { getSeoAlternates } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Privacy Policy | Egypt Excursions Online',
  description: 'Read the privacy policy for Egypt Excursions Online. We are committed to protecting your personal data and ensuring a safe booking experience.',
  openGraph: {
    title: 'Privacy Policy | Egypt Excursions Online',
    description: 'Our commitment to protecting your personal data and ensuring safe bookings.',
    type: 'website',
  },
  alternates: getSeoAlternates('/privacy'),
};

export default function PrivacyPage() {
  return (
    <>
      <WebSiteSchema pageName="Privacy Policy" />
      <PrivacyClientPage />
    </>
  );
}
