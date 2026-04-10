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
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import IcebarPromo from '@/components/IcebarPromo';
import AboutUs from '@/components/AboutUs';
import Reviews from '@/components/Reviews';
import FAQ from '@/components/FAQ';
import AISearchWidget from '@/components/AISearchWidget';
import ReviewsStructuredData from '@/components/ReviewsStructuredData';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import FAQSchema from '@/components/schema/FAQSchema';
import ToursListSchema from '@/components/schema/ToursListSchema';

// Import client-side versions that accept props
import DestinationsServer from '@/components/DestinationsServer';
import FeaturedToursServer from '@/components/FeaturedToursServer';
import InterestGridServer from '@/components/InterestGridServer';
import PopularInterestServer from '@/components/PopularInterestServer';
import DayTripsServer from '@/components/DayTripsServer';
import { getLocale } from 'next-intl/server';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

// ISR - Static generation with 60-second revalidation
// This makes the homepage 10x faster by serving cached static pages
// while still updating content every 60 seconds in the background
export const revalidate = 60; // Revalidate every 60 seconds

async function getHomePageData(locale: string) {
  try {
    await dbConnect();

    // Only show tours from the main (default) tenant — exclude German/other tenant tours
    const defaultTenantFilter = { $or: [{ tenantId: 'default' }, { tenantId: { $exists: false } }, { tenantId: null }] };

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
      // Destinations with tour count (only featured)
      Destination.find({ isPublished: true, featured: true })
        .select('name slug image description country translations')
        .limit(8)
        .lean(),

      // Featured tours (exclude German tenant tours)
      Tour.find({ isPublished: true, isFeatured: true, ...defaultTenantFilter })
        .populate('destination', 'name')
        .select('title slug image discountPrice originalPrice duration rating reviewCount bookings translations')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(8)
        .lean(),

      // Categories for InterestGrid (will add tour counts below)
      Category.find({ isPublished: true })
        .select('name slug icon description translations')
        .limit(12)
        .lean(),

      // All categories for PopularInterest
      Category.find({}).lean(),

      // Attraction pages for PopularInterest
      AttractionPage.find({ isPublished: true, pageType: 'attraction' }).lean(),

      // Category pages for PopularInterest
      AttractionPage.find({ isPublished: true, pageType: 'category' })
        .populate('categoryId', 'name slug')
        .sort({ featured: -1, createdAt: -1 })
        .lean(),

      // Header destinations (featured)
      Destination.find({ isPublished: true, featured: true })
        .select('name slug image description country translations')
        .lean(),

      // Header categories (featured)
      Category.find({ isPublished: true, featured: true })
        .select('name slug icon description translations')
        .lean(),

      // Hero settings
      HeroSettings.findOne({ isActive: true })
        .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription')
        .lean(),

      // Day trips (all published tours, limited to 12, exclude German tenant tours)
      Tour.find({ isPublished: true, ...defaultTenantFilter })
        .select('title slug image discountPrice originalPrice duration rating reviewCount bookings tags translations')
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
      for (const tourId of (offer as any).applicableTours || []) {
        const key = tourId.toString();
        const existing = tourOfferMap.get(key);
        if (!existing || (offer as any).priority > existing.priority ||
            ((offer as any).priority === existing.priority && (offer as any).discountValue > existing.discountValue)) {
          tourOfferMap.set(key, {
            badgeText: (offer as any).featuredBadgeText || (offer as any).name,
            offerType: (offer as any).type,
            discountValue: (offer as any).discountValue,
            priority: (offer as any).priority,
          });
        }
      }
    }

    // Calculate tour counts for destinations
    const destinationsWithCounts = await Promise.all(
      destinations.map(async (dest) => {
        const count = await Tour.countDocuments({
          destination: dest._id,
          isPublished: true,
          ...defaultTenantFilter
        });
        return {
          ...JSON.parse(JSON.stringify(dest)),
          tourCount: count
        };
      })
    );

    // Calculate tour counts for InterestGrid categories
    const interestGridCategories = await Promise.all(
      categories.map(async (category: any) => {
        const tourCount = await Tour.countDocuments({
          category: { $in: [category._id] },
          isPublished: true,
          ...defaultTenantFilter
        });
        return {
          ...JSON.parse(JSON.stringify(category)),
          tourCount
        };
      })
    );

    // Build interests (categories + attractions with tour counts) for PopularInterest
    const categoriesWithCounts = await Promise.all(
      allCategories.map(async (category: any) => {
        // Category is an array field in Tour model, so we need to use $in
        const tourCount = await Tour.countDocuments({
          category: { $in: [category._id] },
          isPublished: true,
          ...defaultTenantFilter
        });
        return {
          type: 'category' as const,
          name: category.name,
          slug: category.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(category._id)),
          image: category.heroImage,
          featured: category.featured,
          translations: category.translations
        };
      })
    );

    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page: any) => {
        let tourCount = 0;
        const searchQueries = [];

        if (page.title) {
          searchQueries.push({ title: { $regex: page.title, $options: 'i' } });
        }

        if (page.keywords && Array.isArray(page.keywords)) {
          const validKeywords = page.keywords.filter((k: string) => k && k.trim().length > 0);
          if (validKeywords.length > 0) {
            searchQueries.push({ tags: { $in: validKeywords.map((k: string) => new RegExp(k, 'i')) } });
            validKeywords.forEach((keyword: string) => {
              searchQueries.push({ title: { $regex: keyword, $options: 'i' } });
            });
          }
        }

        if (searchQueries.length > 0) {
          tourCount = await Tour.countDocuments({
            isPublished: true,
            ...defaultTenantFilter,
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
          image: page.heroImage
        };
      })
    );

    // Combine and filter for featured interests
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts];
    const featuredInterests = allInterests.filter(item => item.featured === true);

    const localizedDestinations = destinationsWithCounts.map((dest: Record<string, unknown>) =>
      localizeEntityFields(dest, locale, ['name', 'description', 'country', 'metaTitle', 'metaDescription'])
    );

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

    const localizedCategories = interestGridCategories.map((category: Record<string, unknown>) =>
      localizeEntityFields(category, locale, [
        'name',
        'description',
        'longDescription',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ])
    );

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

    const localizedHeaderDestinations = JSON.parse(JSON.stringify(headerDestinations)).map((dest: Record<string, unknown>) =>
      localizeEntityFields(dest, locale, ['name', 'description', 'country', 'metaTitle', 'metaDescription'])
    );

    const localizedHeaderCategories = JSON.parse(JSON.stringify(headerCategories)).map((category: Record<string, unknown>) =>
      localizeEntityFields(category, locale, [
        'name',
        'description',
        'longDescription',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ])
    );

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
      destinations: localizedDestinations,
      tours: localizedTours,
      categories: localizedCategories,
      featuredInterests: localizedFeaturedInterests,
      categoryPages: localizedCategoryPages,
      headerDestinations: localizedHeaderDestinations,
      headerCategories: localizedHeaderCategories,
      heroSettings: heroSettings ? JSON.parse(JSON.stringify(heroSettings)) : null,
      dayTrips: localizedDayTrips
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
    categories,
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
      <WebSiteSchema />
      <ReviewsStructuredData />
      <FAQSchema
        items={[
          { question: 'Can I reschedule or cancel my tickets?', answer: 'Yes, in most cases you can reschedule or cancel your tickets up to 24 hours in advance. Please check the specific conditions for your chosen tour or attraction on its product page.' },
          { question: 'How long are open tickets valid?', answer: 'Open tickets, which do not require a specific date and time slot, are typically valid for one year from the date of purchase.' },
          { question: 'What languages do the tour guides speak?', answer: 'Our live guided tours are most commonly offered in English and the local language. Many tours also offer audio guides in multiple languages, including Spanish, French, German, Italian, and more.' },
          { question: 'Is my booking confirmed instantly?', answer: 'Yes, most of our bookings are confirmed instantly after a successful payment. You will receive a booking confirmation email with your tickets and all necessary information right away.' },
          { question: 'Do I need to print my ticket?', answer: 'No. All our tickets are mobile-friendly. You can simply show the e-ticket on your smartphone or tablet to the tour guide or at the entrance.' },
          { question: 'What happens if my tour is canceled by the operator?', answer: 'In the rare event that a tour is canceled by the operator due to unforeseen circumstances, we will notify you immediately and provide a full refund or help you find a suitable alternative.' },
          { question: 'Are there any hidden fees?', answer: 'The price you see on the product page is the final price. There are no hidden fees or extra charges at checkout.' },
        ]}
      />
      <ToursListSchema
        tours={(tours as any[]).map((t: any) => ({
          title: t.title,
          slug: t.slug,
          image: t.image,
          discountPrice: t.discountPrice,
          originalPrice: t.originalPrice,
          rating: t.rating,
          reviewCount: t.reviewCount,
          duration: t.duration,
        }))}
        listName="Featured Tours & Excursions in Egypt"
        listDescription="Discover the most popular tours, day trips, and activities across Egypt"
      />
      <main>
      <Header
        initialDestinations={headerDestinations}
        initialCategories={headerCategories}
      />
      <HeroSection initialSettings={heroSettings} />

      {/* Pass pre-fetched data as props */}
      <DestinationsServer destinations={destinations as any} />
      <IcebarPromo />
      <FeaturedToursServer tours={tours} />
      <PopularInterestServer interests={featuredInterests as any} categoryPages={categoryPages as any} />
      <InterestGridServer categories={categories as any} />
      <DayTripsServer tours={dayTrips} />

      <AboutUs />
      <Reviews />
      <FAQ />
      <Footer />
      <AISearchWidget />
    </main>
    </>
  );
}
