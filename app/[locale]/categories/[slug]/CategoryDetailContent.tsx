// Pure category-detail renderer (no URL resolution). Route entry points decide
// render-vs-redirect and call renderCategoryDetail() when it should render.
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour as TourType, Category as CategoryType } from '@/types';
import CategoryPageClient from './CategoryPageClient';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import {
  selectLocalizedTaxonomyEntries,
  selectLocalizedTours,
} from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export async function getCategoryMetadata(slug: string, locale: string): Promise<Metadata | null> {
  await dbConnect();

  const categoryMatches = await CategoryModel.find({ slug })
    .select('name description heroImage metaTitle metaDescription keywords translations')
    .lean();

  const categoryCandidate = selectLocalizedTaxonomyEntries(
    JSON.parse(JSON.stringify(categoryMatches)) as Record<string, unknown>[],
    locale,
    ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription', 'highlights', 'features']
  )[0];

  const category = categoryCandidate
    ? localizeEntityFields(categoryCandidate, locale, [
        'name',
        'description',
        'longDescription',
        'metaTitle',
        'metaDescription',
        'highlights',
        'features',
      ])
    : null;

  if (!category) return null;

  return {
    title: (category as any).metaTitle || `${(category as any).name} Tours | Egypt Excursions Online`,
    description: (category as any).metaDescription || String((category as any).description || '').substring(0, 160) || `Explore ${(category as any).name} tours and activities`,
    keywords: Array.isArray((category as any).keywords) ? (category as any).keywords.join(', ') : undefined,
    openGraph: {
      title: (category as any).name,
      description: String((category as any).description || '').substring(0, 160),
      images: category.heroImage ? [category.heroImage as string] : [],
      type: 'website',
    },
  };
}

async function getPageData(slug: string, locale: string) {
  await dbConnect();

  const categoryMatches = await CategoryModel.find({ slug }).lean();
  if (categoryMatches.length === 0) {
    return { category: null, categoryTours: [] };
  }

  const serializedCategories = JSON.parse(JSON.stringify(categoryMatches)) as Record<string, unknown>[];
  const categoryCandidate = selectLocalizedTaxonomyEntries(
    serializedCategories,
    locale,
    ['name', 'description', 'longDescription', 'highlights', 'features', 'metaTitle', 'metaDescription']
  )[0];

  if (!categoryCandidate) {
    return { category: null, categoryTours: [] };
  }

  const categoryIds = serializedCategories.map((category) => (category as any)._id);
  const baseTours = await TourModel.find({
    category: { $in: categoryIds },
    isPublished: true,
    ...DEFAULT_TENANT_FILTER,
  }).populate('destination').populate('category').lean();

  const serializedBaseTours = JSON.parse(JSON.stringify(baseTours)) as Record<string, unknown>[];
  const candidateSlugs = serializedBaseTours
    .map((tour) => String(tour.slug || ''))
    .filter(Boolean);

  let serializedTourCandidates = serializedBaseTours;

  if (locale.startsWith('de') && candidateSlugs.length > 0) {
    const localizedTourMatches = await TourModel.find({
      category: { $in: categoryIds },
      isPublished: true,
      slug: { $in: candidateSlugs },
    }).populate('destination').populate('category').lean();

    serializedTourCandidates = JSON.parse(JSON.stringify(localizedTourMatches)) as Record<string, unknown>[];
  }

  const localizedCategory = localizeEntityFields(categoryCandidate, locale, [
    'name',
    'description',
    'longDescription',
    'highlights',
    'features',
    'metaTitle',
    'metaDescription',
  ]);

  const localizedTours = selectLocalizedTours(
    serializedTourCandidates.filter((tour) => candidateSlugs.includes(String(tour.slug || ''))),
    locale
  ).map((tour: Record<string, unknown>) => {
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
  const slugCountMap = new Map<string, number>();

  for (const category of relatedCategories as any[]) {
    const slug = String(category.slug || '');
    if (!slug) continue;
    const count = countMap.get(String(category._id)) || 0;
    slugCountMap.set(slug, Math.max(slugCountMap.get(slug) || 0, count));
  }

  return selectLocalizedTaxonomyEntries(
    JSON.parse(JSON.stringify(relatedCategories)) as Record<string, unknown>[],
    locale,
    ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription', 'highlights', 'features']
  )
    .map((category: any) => {
      const localized = localizeEntityFields(category, locale, ['name', 'description']);
      return {
        type: 'category' as const,
        _id: String(category._id),
        slug: category.slug,
        name: String((localized as any).name || category.name || ''),
        image: category.heroImage,
        featured: Boolean(category.featured),
        products: slugCountMap.get(String(category.slug || '')) || countMap.get(String(category._id)) || 0,
      };
    })
    .filter((category) => category.products > 0);
}

export async function renderCategoryDetail(slug: string, locale: string): Promise<React.ReactElement | null> {
  const { category, categoryTours } = await getPageData(slug, locale);

  if (!category) return null;

  const relatedInterests = await getRelatedCategoryInterests(
    String((category as any)._id),
    slug,
    locale
  );

  return (
    <>
      <CollectionSchema
        name={(category as any).name}
        description={(category as any).description}
        url={`/categories/${slug}`}
        items={categoryTours.map((t: any) => ({ name: t.title, url: `/tour/${t.slug}`, image: t.image }))}
      />
      <CategoryPageClient
        category={category as unknown as CategoryType}
        categoryTours={categoryTours as unknown as TourType[]}
        relatedInterests={relatedInterests}
      />
    </>
  );
}
