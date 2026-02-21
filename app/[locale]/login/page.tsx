// app/login/page.tsx
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LoginClient from './LoginClient';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

// Generate locale-aware metadata for SEO
export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'loginPage.meta' });

  return {
    title: t('title'),
    description: t('description'),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function LoginPage() {
  return <LoginClient />;
}
