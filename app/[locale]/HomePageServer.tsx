// app/HomePageServer.tsx
import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import HeroSettings from '@/lib/models/HeroSettings';
import SpecialOffer from '@/lib/models/SpecialOffer';
import Header from '@/components/Header';
import HeroSectionStable from '@/components/HeroSectionStable';
import HomeDeferredSections from '@/components/HomeDeferredSections';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import ToursListSchema from '@/components/schema/ToursListSchema';

// Import client-side versions that accept props
import DestinationsServer from '@/components/DestinationsServer';
import { getLocale } from 'next-intl/server';
import { escapeRegex } from '@/lib/utils/escapeRegex';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTaxonomyEntries } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import type { Category as CategoryData, Destination as DestinationData, Tour as TourData } from '@/types';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';

type FeaturedInterest = {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
  image?: string;
  urlType?: string;
  parentPage?: CategoryData['parentPage'];
};

type CategoryPageSummary = {
  _id: string;
  slug: string;
  pageType: 'category';
  isPublished: boolean;
  heroImage?: string;
  urlType?: string;
  parentPage?: CategoryData['parentPage'];
  categoryId?: { name: string; slug: string };
};

// ISR - Static generation with 60-second revalidation
// This makes the homepage 10x faster by serving cached static pages
// while still updating content every 60 seconds in the background
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant

async function getHomePageData(locale: string) {
  try {
    await dbConnect();

    // Only show tours from the main (default) tenant — exclude German/other tenant tours
    // Fetch all data in parallel for speed
    const [
      destinations,
      featuredTours,
      categories,
      allCategories,
      attractionPages,
      categoryPages,
      headerDestinations,
      headerCategories,
      heroSettings,
      dayTrips,
      activeOffers
    ] = await Promise.all([
      // Featured destinations (candidates — narrowed below to those that
      // actually have tours on this default site, ranked by tour count).
      Destination.find({ isPublished: true, featured: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .select('name slug image description country urlType parentPage archivedAt translations')
        .lean(),

      // Featured tours (exclude German tenant tours)
      Tour.find({ isPublished: true, isFeatured: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .populate('destination', 'name slug')
        .select('title slug urlType parentPage image discountPrice originalPrice pricingSummary duration rating reviewCount bookings translations')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(8)
        .lean(),

      // Categories for InterestGrid (will add tour counts below)
      Category.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .select('name slug icon heroImage description urlType parentPage archivedAt translations')
        .limit(12)
        .lean(),

      // All categories for PopularInterest
      Category.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER }).lean(),

      // Attraction pages for PopularInterest
      AttractionPage.find({ isPublished: true, pageType: 'attraction', archivedAt: null, ...DEFAULT_TENANT_FILTER }).lean(),

      // Category pages for PopularInterest
      AttractionPage.find({ isPublished: true, pageType: 'category', archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .populate('categoryId', 'name slug')
        .sort({ featured: -1, createdAt: -1 })
        .lean(),

      // Header destinations (featured)
      Destination.find({ isPublished: true, featured: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .select('name slug image description country urlType parentPage archivedAt translations')
        .lean(),

      // Header categories (featured)
      Category.find({ isPublished: true, featured: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .select('name slug icon heroImage description urlType parentPage archivedAt translations')
        .lean(),

      // Hero settings
      HeroSettings.findOne({ isActive: true })
        .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription')
        .lean(),

      // Day trips (all published tours, limited to 12, exclude German tenant tours)
      Tour.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .populate('destination', 'name slug')
        .select('title slug urlType parentPage destination image discountPrice originalPrice pricingSummary duration rating reviewCount bookings tags translations')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(12)
        .lean(),

      // Active featured special offers (for badge display on tour cards)
      SpecialOffer.find({
        isActive: true,
        isFeatured: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      })
        .select('name featuredBadgeText type discountValue applicableTours priority')
        .sort({ priority: -1 })
        .lean()
    ]);

    // Build tour → best offer map (highest priority wins, then highest discount)
    const tourOfferMap = new Map<string, { badgeText: string; offerType: string; discountValue: number; priority: number }>();
    for (const offer of activeOffers) {
      for (const tourId of offer.applicableTours || []) {
        const key = tourId.toString();
        const existing = tourOfferMap.get(key);
        if (!existing || offer.priority > existing.priority ||
            (offer.priority === existing.priority && offer.discountValue > existing.discountValue)) {
          tourOfferMap.set(key, {
            badgeText: offer.featuredBadgeText || offer.name,
            offerType: offer.type,
            discountValue: offer.discountValue,
            priority: offer.priority,
          });
        }
      }
    }

    // Tour counts per destination for THIS default site (one aggregation).
    const destinationCountAgg = await Tour.aggregate<{ _id: unknown; tourCount: number }>([
      { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
      { $group: { _id: '$destination', tourCount: { $sum: 1 } } },
    ]);
    const tourCountByDestination = new Map<string, number>(
      destinationCountAgg.map((row) => [String(row._id), row.tourCount])
    );

    // Only surface destinations that actually have tours here, ranked by count.
    // This also drops duplicate/other-tenant destination records (which have 0
    // default-tenant tours) so the homepage never shows empty "0 tours" cards.
    const destinationsWithCounts = destinations
      .map((dest) => ({
        ...JSON.parse(JSON.stringify(dest)),
        tourCount: tourCountByDestination.get(String(dest._id)) || 0,
      }))
      .filter((dest) => dest.tourCount > 0)
      .sort((a, b) => b.tourCount - a.tourCount)
      .slice(0, 8);

    // Tour counts per category for THIS default site (one aggregation).
    // These lists are network-wide — 611 published and 779 total at the time of
    // writing — so counting per category cost ~1,390 queries and pushed the whole
    // render past the serverless budget, which the catch below then turned into a
    // silently empty homepage. Category is an array field on Tour, and $unwind
    // also handles the legacy records that stored a single id.
    const categoryCountAgg = await Tour.aggregate<{ _id: unknown; tourCount: number }>([
      { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
      { $unwind: '$category' },
      { $group: { _id: '$category', tourCount: { $sum: 1 } } },
    ]);
    const tourCountByCategory = new Map<string, number>(
      categoryCountAgg.map((row) => [String(row._id), row.tourCount])
    );

    // Tour counts for InterestGrid categories
    const interestGridCategories = filterVisibleTaxonomyEntries(
      categories.map((category) => ({
        ...JSON.parse(JSON.stringify(category)),
        tourCount: tourCountByCategory.get(String(category._id)) || 0,
      })),
      { requireTours: true },
    );

    // Build interests (categories + attractions with tour counts) for PopularInterest
    const categoriesWithCounts = allCategories
      .map((category) => ({
        type: 'category' as const,
        name: category.name,
        slug: category.slug,
        products: tourCountByCategory.get(String(category._id)) || 0,
        _id: JSON.parse(JSON.stringify(category._id)),
        image: category.heroImage,
        featured: category.featured,
        urlType: category.urlType,
        parentPage: category.parentPage,
        translations: category.translations,
      }))
      .filter((category) => category.products > 0);

    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page) => {
        let tourCount = 0;
        const searchQueries = [];

        // Titles and keywords are editor content, never patterns. Feeding them
        // to the regex engine raw let one keyword ending in a backslash throw
        // `Invalid regular expression`, which the catch below turned into a
        // completely empty homepage.
        if (page.title) {
          searchQueries.push({ title: { $regex: escapeRegex(page.title), $options: 'i' } });
        }

        if (page.keywords && Array.isArray(page.keywords)) {
          const validKeywords = page.keywords.filter((k: string) => k && k.trim().length > 0);
          if (validKeywords.length > 0) {
            searchQueries.push({ tags: { $in: validKeywords.map((k: string) => new RegExp(escapeRegex(k), 'i')) } });
            validKeywords.forEach((keyword: string) => {
              searchQueries.push({ title: { $regex: escapeRegex(keyword), $options: 'i' } });
            });
          }
        }

        if (searchQueries.length > 0) {
          tourCount = await Tour.countDocuments({
            isPublished: true,
            archivedAt: null,
            ...DEFAULT_TENANT_FILTER,
            $and: [{ $or: searchQueries }]
          });
        }

        return {
          type: 'attraction' as const,
          name: page.title,
          slug: page.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(page._id)),
          featured: page.featured,
          image: page.heroImage,
          urlType: page.urlType,
          parentPage: page.parentPage,
        };
      })
    );

    // Combine and filter for featured interests
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts.filter((item) => item.products > 0)];
    const featuredInterests = allInterests.filter(item => item.featured === true && item.products > 0);

    const localizedDestinations = selectLocalizedTaxonomyEntries(
      destinationsWithCounts as Record<string, unknown>[],
      locale,
      ['name', 'description', 'country', 'metaTitle', 'metaDescription']
    ).map((dest: Record<string, unknown>) => ({
      ...localizeEntityFields(dest, locale, ['name', 'description', 'country', 'metaTitle', 'metaDescription']),
      tourCount: tourCountByDestination.get(String(dest._id)) || 0,
    })).filter((destination) => destination.tourCount > 0);

    const toursForFeaturedSection = featuredTours.length > 0 ? featuredTours : dayTrips.slice(0, 8);

    const localizedTours = JSON.parse(JSON.stringify(toursForFeaturedSection)).map((tour: Record<string, unknown>) => {
      const localized = localizeEntityFields(tour, locale, [
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
      const offer = tourOfferMap.get(String(tour._id));
      if (offer) {
        localized.specialOffer = {
          badgeText: offer.badgeText,
          offerType: offer.offerType,
          discountValue: offer.discountValue,
        };
      }
      return localized;
    });

    const localizedCategories = selectLocalizedTaxonomyEntries(
      interestGridCategories as Record<string, unknown>[],
      locale,
      ['name', 'description', 'longDescription', 'highlights', 'features', 'metaTitle', 'metaDescription']
    ).map((category: Record<string, unknown>) => ({
      ...localizeEntityFields(category, locale, [
        'name',
        'description',
        'longDescription',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ]),
      tourCount: tourCountByCategory.get(String(category._id)) || 0,
    })).filter((category) => category.tourCount > 0);

    const localizedFeaturedInterests = featuredInterests.map((interest: Record<string, unknown>) =>
      localizeEntityFields(interest, locale, ['name', 'description', 'metaTitle', 'metaDescription'])
    );

    const localizedCategoryPages = JSON.parse(JSON.stringify(categoryPages)).map((page: Record<string, unknown>) =>
      localizeEntityFields(page, locale, [
        'title',
        'description',
        'longDescription',
        'gridTitle',
        'gridSubtitle',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ])
    );

    const localizedHeaderDestinations = selectLocalizedTaxonomyEntries(
      JSON.parse(JSON.stringify(headerDestinations)) as Record<string, unknown>[],
      locale,
      ['name', 'description', 'country', 'metaTitle', 'metaDescription']
    ).map((dest: Record<string, unknown>) => ({
      ...localizeEntityFields(dest, locale, ['name', 'description', 'country', 'metaTitle', 'metaDescription']),
      tourCount: tourCountByDestination.get(String(dest._id)) || 0,
    })).filter((destination) => destination.tourCount > 0);

    const localizedHeaderCategories = selectLocalizedTaxonomyEntries(
      JSON.parse(JSON.stringify(headerCategories)) as Record<string, unknown>[],
      locale,
      ['name', 'description', 'longDescription', 'highlights', 'features', 'metaTitle', 'metaDescription']
    ).map((category: Record<string, unknown>) => ({
      ...localizeEntityFields(category, locale, [
        'name',
        'description',
        'longDescription',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ]),
      tourCount: tourCountByCategory.get(String(category._id)) || 0,
    })).filter((category) => category.tourCount > 0);

    const localizedDayTrips = JSON.parse(JSON.stringify(dayTrips)).map((tour: Record<string, unknown>) => {
      const localized = localizeEntityFields(tour, locale, [
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
      const offer = tourOfferMap.get(String(tour._id));
      if (offer) {
        localized.specialOffer = {
          badgeText: offer.badgeText,
          offerType: offer.offerType,
          discountValue: offer.discountValue,
        };
      }
      return localized;
    });

    return {
      destinations: localizedDestinations as unknown as (DestinationData & { tourCount: number })[],
      tours: localizedTours as unknown as TourData[],
      categories: localizedCategories as unknown as CategoryData[],
      featuredInterests: localizedFeaturedInterests as unknown as FeaturedInterest[],
      categoryPages: localizedCategoryPages as unknown as CategoryPageSummary[],
      headerDestinations: localizedHeaderDestinations as unknown as DestinationData[],
      headerCategories: localizedHeaderCategories as unknown as CategoryData[],
      heroSettings: heroSettings ? JSON.parse(JSON.stringify(heroSettings)) : null,
      dayTrips: localizedDayTrips as unknown as TourData[]
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      destinations: [],
      tours: [],
      categories: [],
      featuredInterests: [],
      categoryPages: [],
      headerDestinations: [],
      headerCategories: [],
      heroSettings: null,
      dayTrips: []
    };
  }
}

export default async function HomePageServer() {
  const locale = await getLocale();
  const {
    destinations,
    tours,
    featuredInterests,
    categoryPages,
    headerDestinations,
    headerCategories,
    heroSettings,
    dayTrips
  } = await getHomePageData(locale);

  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema locale={locale} />
      <ToursListSchema
        locale={locale}
        tours={tours.map((tour) => ({
          title: tour.title,
          slug: tour.slug,
          urlType: tour.urlType,
          destination: tour.destination,
          parentPage: tour.parentPage,
          image: tour.image,
        }))}
        listName="Featured Tours"
      />
      <main>
      <Header
        initialDestinations={headerDestinations}
        initialCategories={headerCategories}
      />
      <HeroSectionStable initialSettings={heroSettings} />

      <DestinationsServer destinations={destinations} />
      <HomeDeferredSections
        tours={tours}
        featuredInterests={featuredInterests}
        categoryPages={categoryPages}
        dayTrips={dayTrips}
      />
    </main>
    </>
  );
}
