import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SignupClient from './SignupClient';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

interface SignupPageProps {
  params: Promise<{ locale: string }>;
}

// Generate locale-aware metadata for SEO
export async function generateMetadata({ params }: SignupPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'signupPage.meta' });

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function SignupPage() {
  return <SignupClient />;
}
