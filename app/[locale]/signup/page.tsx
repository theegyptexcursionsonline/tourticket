import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SignupClient from './SignupClient';
import { PRIVATE_ROUTE_METADATA } from '@/lib/seo/privateRouteMetadata';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

interface SignupPageProps {
  params: Promise<{ locale: string }>;
}

// Keep the localized title while ensuring the account page is never indexed.
export async function generateMetadata({ params }: SignupPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'signupPage.meta' });

  return {
    ...PRIVATE_ROUTE_METADATA,
    title: t('title'),
    description: t('description'),
  };
}

export default function SignupPage() {
  return <SignupClient />;
}
