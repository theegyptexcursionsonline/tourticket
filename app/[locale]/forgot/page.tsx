import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ForgotPasswordClient from './ForgotPasswordClient';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

// Generate locale-aware metadata for SEO
export async function generateMetadata({ params }: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forgotPage.meta' });

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
