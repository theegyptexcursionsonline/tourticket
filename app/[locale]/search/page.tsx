// app/search/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import SearchClient from './SearchClient';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { Loader2 } from 'lucide-react';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;

interface SearchPageProps {
  params: Promise<{ locale: string }>;
}

// Generate locale-aware metadata for SEO
export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'searchPage.meta' });

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('openGraphTitle'),
      description: t('openGraphDescription'),
      type: 'website',
    },
  };
}

async function getFilters() {
    // Skip database fetch during build if MONGODB_URI is not set
    if (!process.env.MONGODB_URI) {
        console.warn('⚠️ Skipping search filters fetch - MONGODB_URI not set');
        return { categories: [], destinations: [] };
    }

    try {
        await dbConnect();
        const [categories, destinations] = await Promise.all([
            Category.find({}).sort({ name: 1 }).lean(),
            Destination.find({}).sort({ name: 1 }).lean()
        ]);

        return {
            categories: JSON.parse(JSON.stringify(categories)),
            destinations: JSON.parse(JSON.stringify(destinations)),
        };
    } catch (error) {
        console.error("Failed to fetch filters:", error);
        return { categories: [], destinations: [] };
    }
}

// A fallback component to show while the client component is loading
function Loading({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-red-600" />
            <p className="ml-4 text-slate-500">{label}</p>
        </div>
    );
}

export default async function SearchPage({ params }: SearchPageProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'searchPage' });
    const { categories, destinations } = await getFilters();

    return (
        <Suspense fallback={<Loading label={t('loadingTours')} />}>
            <SearchClient
                initialTours={[]}
                categories={categories}
                destinations={destinations}
            />
        </Suspense>
    );
}
