// Pure category-detail renderer (no URL resolution). Route entry points decide
// render-vs-redirect and call renderCategoryDetail() when it should render.
import React from 'react';
import { Metadata } from 'next';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import DestinationModel from '@/lib/models/Destination';
import { Tour as TourType, Category as CategoryType } from '@/types';
import CategoryPageClient from './CategoryPageClient';
import CollectionSchema from '@/components/schema/CollectionSchema';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import { categoryStructuredFields } from '@/lib/i18n/translationFields';
import { metadataAlternates } from '@/lib/i18n/seoAlternates';
import {
  selectLocalizedTaxonomyEntries,
  selectLocalizedTours,
} from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { contentPath } from '@/lib/content/contentUrl';
import { resolveLinkedPageCards } from '@/lib/attractionPages/pageContent';

export async function getCategoryMetadata(slug: string, locale: string, canonicalPath?: string): Promise<Metadata | null> {
  await dbConnect();

  const categoryMatches = await CategoryModel.find({ slug, ...DEFAULT_TENANT_FILTER })
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

  const categoryName = String(category.name || 'Category');
  const categoryDescription = String(category.description || '');

  return {
    title: String(category.metaTitle || `${categoryName} Tours | Egypt Excursions Online`),
    description: String(category.metaDescription || categoryDescription.substring(0, 160) || `Explore ${categoryName} tours and activities`),
    keywords: Array.isArray(category.keywords) ? category.keywords.map(String).join(', ') : undefined,
    ...(canonicalPath ? { alternates: metadataAlternates(locale, canonicalPath) } : {}),
    openGraph: {
      title: categoryName,
      description: categoryDescription.substring(0, 160),
      images: category.heroImage ? [category.heroImage as string] : [],
      type: 'website',
    },
  };
}

async function getPageData(slug: string, locale: string) {
  await dbConnect();

  const categoryMatches = await CategoryModel.find({ slug, ...DEFAULT_TENANT_FILTER })
    .populate({
      path: 'popularDestinationIds',
      model: DestinationModel,
      match: { isPublished: true, ...DEFAULT_TENANT_FILTER },
      select: 'name slug image description country',
    })
    .lean();
  if (categoryMatches.length === 0) {
    return { category: null, categoryTours: [] };
  }

  const serializedCategories = JSON.parse(JSON.stringify(categoryMatches)) as Record<string, unknown>[];
  const categoryCandidate = selectLocalizedTaxonomyEntries(
    serializedCategories,
    locale,
    ['name', 'description', 'longDescription', 'highlights', 'features', 'linkedPagesTitle', 'linkedPagesSubtitle', 'metaTitle', 'metaDescription']
  )[0];

  if (!categoryCandidate) {
    return { category: null, categoryTours: [] };
  }

  const categoryIds = serializedCategories.map((category) => String(category._id));
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
      ...DEFAULT_TENANT_FILTER,
    }).populate('destination').populate('category').lean();

    serializedTourCandidates = JSON.parse(JSON.stringify(localizedTourMatches)) as Record<string, unknown>[];
  }

  const localizedCategory = localizeStructuredEntries(
    localizeEntityFields(categoryCandidate, locale, [
      'name',
      'description',
      'longDescription',
      'highlights',
      'features',
      'linkedPagesTitle',
      'linkedPagesSubtitle',
      'metaTitle',
      'metaDescription',
    ]),
    locale,
    categoryStructuredFields,
  );

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
    ...DEFAULT_TENANT_FILTER,
  })
    .select('name slug heroImage featured order description translations')
    .sort({ featured: -1, order: 1, name: 1 })
    .limit(12)
    .lean();

  if (relatedCategories.length === 0) {
    return [];
  }

  const categoryIds = relatedCategories.map((category) => category._id);
  const counts = await TourModel.aggregate<{ _id: unknown; count: number }>([
    {
      $match: {
        isPublished: true,
        category: { $in: categoryIds },
        ...DEFAULT_TENANT_FILTER,
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

  const countMap = new Map(counts.map((item) => [String(item._id), Number(item.count) || 0]));
  const slugCountMap = new Map<string, number>();

  for (const category of relatedCategories) {
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
    .map((category) => {
      const localized = localizeEntityFields(category, locale, ['name', 'description']);
      return {
        type: 'category' as const,
        _id: String(category._id),
        slug: String(category.slug || ''),
        name: String(localized.name || category.name || ''),
        image: typeof category.heroImage === 'string' ? category.heroImage : undefined,
        featured: Boolean(category.featured),
        products: slugCountMap.get(String(category.slug || '')) || countMap.get(String(category._id)) || 0,
      };
    })
    .filter((category) => category.products > 0);
}

export async function renderCategoryDetail(slug: string, locale: string): Promise<React.ReactElement | null> {
  const { category, categoryTours } = await getPageData(slug, locale);

  if (!category) return null;

  const [relatedInterests, linkedPages] = await Promise.all([
    getRelatedCategoryInterests(String(category._id), slug, locale),
    resolveLinkedPageCards(category, locale),
  ]);

  return (
    <>
      <CollectionSchema
        name={String(category.name || '')}
        description={String(category.description || '')}
        url={`/categories/${slug}`}
        items={categoryTours.map((tour) => ({
          name: String(tour.title || ''),
          url: contentPath('tour', String(tour.slug || ''), (tour as { urlType?: string }).urlType),
          image: typeof tour.image === 'string' ? tour.image : undefined,
        }))}
      />
      <CategoryPageClient
        category={category as unknown as CategoryType}
        categoryTours={categoryTours as unknown as TourType[]}
        relatedInterests={relatedInterests}
        linkedPages={linkedPages}
      />
    </>
  );
}
