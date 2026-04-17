// app/categories/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Category } from '@/types';
import CategoryPageClient from './CategoryPageClient';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  try {
    const { locale, slug } = await params;
    await dbConnect();
    
    const categoryRaw = await CategoryModel.findOne({ slug })
      .select('name description heroImage metaTitle metaDescription keywords translations')
      .lean();

    const category = categoryRaw
      ? localizeEntityFields(categoryRaw as Record<string, unknown>, locale, [
          'name',
          'description',
          'longDescription',
          'metaTitle',
          'metaDescription',
          'highlights',
          'features',
        ])
      : null;

    if (!category) {
      return {
        title: 'Category Not Found',
        description: 'The category you are looking for does not exist.',
      };
    }

    return {
      title: (category as any).metaTitle || `${(category as any).name} Tours | Egypt Excursions Online`,
      description: (category as any).metaDescription || String((category as any).description || '').substring(0, 160) || `Explore ${(category as any).name} tours and activities`,
      keywords: Array.isArray((category as any).keywords) ? (category as any).keywords.join(', ') : undefined,
      openGraph: {
        title: (category as any).name,
        description: String((category as any).description || '').substring(0, 160),
        images: category.heroImage ? [category.heroImage] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Category - Egypt Excursions Online',
      description: 'Explore our tour categories',
    };
  }
}

async function getPageData(slug: string, locale: string) {
  await dbConnect();

  const categoryRaw = await CategoryModel.findOne({ slug }).lean();
  if (!categoryRaw) {
    return { category: null, categoryTours: [] };
  }

  const categoryTours = await TourModel.find({
    category: { $in: [(categoryRaw as any)._id] },
    isPublished: true
  }).populate('destination').lean();
  
  const serializedCategory = JSON.parse(JSON.stringify(categoryRaw));
  const serializedTours = JSON.parse(JSON.stringify(categoryTours));

  const localizedCategory = localizeEntityFields(serializedCategory, locale, [
    'name',
    'description',
    'longDescription',
    'highlights',
    'features',
    'metaTitle',
    'metaDescription',
  ]);

  const localizedTours = serializedTours.map((tour: Record<string, unknown>) => {
    const localizedTour = localizeEntityFields(tour, locale, [
      'title',
      'description',
      'longDescription',
      'location',
      'duration',
      'includes',
      'highlights',
      'whatsIncluded',
      'whatsNotIncluded',
      'tags',
      'metaTitle',
      'metaDescription',
    ]);

    if (localizedTour.destination && typeof localizedTour.destination === 'object') {
      localizedTour.destination = localizeEntityFields(
        localizedTour.destination as Record<string, unknown>,
        locale,
        ['name', 'description', 'country']
      );
    }

    if (localizedTour.category && typeof localizedTour.category === 'object') {
      localizedTour.category = localizeEntityFields(
        localizedTour.category as Record<string, unknown>,
        locale,
        ['name', 'description', 'longDescription']
      );
    }

    return localizedTour;
  });

  return { 
    category: localizedCategory, 
    categoryTours: localizedTours,
  };
}

async function getRelatedCategoryInterests(currentCategoryId: string, currentSlug: string, locale: string) {
  const relatedCategories = await CategoryModel.find({
    isPublished: true,
    slug: { $ne: currentSlug },
    _id: { $ne: currentCategoryId },
  })
    .select('name slug heroImage featured order description translations')
    .sort({ featured: -1, order: 1, name: 1 })
    .limit(12)
    .lean();

  if (relatedCategories.length === 0) {
    return [];
  }

  const categoryIds = relatedCategories.map((category: any) => category._id);
  const counts = await TourModel.aggregate([
    {
      $match: {
        isPublished: true,
        category: { $in: categoryIds },
      },
    },
    { $unwind: '$category' },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ]).catch(() => []);

  const countMap = new Map(counts.map((item: any) => [String(item._id), Number(item.count) || 0]));

  return relatedCategories
    .map((category: any) => {
      const localized = localizeEntityFields(category, locale, ['name', 'description']);
      return {
        type: 'category' as const,
        _id: String(category._id),
        slug: category.slug,
        name: String((localized as any).name || category.name || ''),
        image: category.heroImage,
        featured: Boolean(category.featured),
        products: countMap.get(String(category._id)) || 0,
      };
    })
    .filter((category) => category.products > 0);
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const resolvedParams = await params;
  const { category, categoryTours } = await getPageData(
    resolvedParams.slug,
    resolvedParams.locale
  );

  if (!category) {
    notFound();
  }

  const relatedInterests = await getRelatedCategoryInterests(
    String((category as any)._id),
    resolvedParams.slug,
    resolvedParams.locale
  );

  return (
    <>
      <CollectionSchema
        name={(category as any).name}
        description={(category as any).description}
        url={`/categories/${resolvedParams.slug}`}
        items={categoryTours.map((t: any) => ({ name: t.title, url: `/tour/${t.slug}`, image: t.image }))}
      />
      <CategoryPageClient
        category={category}
        categoryTours={categoryTours}
        relatedInterests={relatedInterests}
      />
    </>
  );
}
