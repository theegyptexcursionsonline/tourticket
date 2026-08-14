import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InterestsClientPage from './InterestsClientPage';
import { ICategory } from '@/lib/models/Category';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTaxonomyEntries } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'All Categories & Interests | Egypt Excursions Online',
  description: 'Explore all tour categories and interests in Egypt. Discover adventure tours, cultural experiences, boat tours, desert experiences, and more.',
  openGraph: {
    title: 'All Categories & Interests | Egypt Excursions Online',
    description: 'Explore all tour categories and interests in Egypt.',
    type: 'website',
  },
};

interface CategoryWithCount extends ICategory {
  tourCount: number;
}

// Server-side function to fetch all categories and their tour counts
async function getCategoriesWithTourCounts(locale: string): Promise<CategoryWithCount[]> {
  // Skip database fetch during build if MONGODB_URI is not set
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️ Skipping interests fetch - MONGODB_URI not set');
    return [];
  }

  try {
    await dbConnect();
    
    // Fetch all published categories
    const categories = await Category.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
      .sort({ order: 1, name: 1 })
      .lean();
    
    const categoryCounts = await Tour.aggregate<{ _id: unknown; tourCount: number }>([
      { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
      { $unwind: '$category' },
      { $group: { _id: '$category', tourCount: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(categoryCounts.map((row) => [String(row._id), row.tourCount]));
    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      tourCount: countByCategory.get(String(category._id)) || 0,
    }));

    // Serialize the data to pass to the client component
    const localizedCategories = selectLocalizedTaxonomyEntries(
      JSON.parse(JSON.stringify(categoriesWithCounts)) as Record<string, unknown>[],
      locale,
      ['name', 'description', 'longDescription', 'highlights', 'features', 'metaTitle', 'metaDescription']
    ).map((category: Record<string, unknown>) =>
      localizeEntityFields(category, locale, [
        'name',
        'description',
        'longDescription',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ])
    ) as unknown as CategoryWithCount[];

    return filterVisibleTaxonomyEntries(localizedCategories, { requireTours: true });
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return [];
  }
}

// The main server component for the /interests route
export default async function InterestsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const categories = await getCategoriesWithTourCounts(locale);

  return (
    <>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <InterestsClientPage categories={categories} />
      </main>
      <Footer />
    </>
  );
}
