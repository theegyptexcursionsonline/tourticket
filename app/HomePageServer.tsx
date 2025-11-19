// app/HomePageServer.tsx
import React from 'react';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import HeroSettings from '@/lib/models/HeroSettings';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import IcebarPromo from '@/components/IcebarPromo';
import AboutUs from '@/components/AboutUs';
import Reviews from '@/components/Reviews';
import FAQ from '@/components/FAQ';
import AISearchWidget from '@/components/AISearchWidget';
import ReviewsStructuredData from '@/components/ReviewsStructuredData';

// Import client-side versions that accept props
import DestinationsServer from '@/components/DestinationsServer';
import FeaturedToursServer from '@/components/FeaturedToursServer';
import InterestGridServer from '@/components/InterestGridServer';
import PopularInterestServer from '@/components/PopularInterestServer';
import DayTripsServer from '@/components/DayTripsServer';

// NO CACHING - Real-time data from admin panel
export const revalidate = 0; // Force dynamic rendering
export const dynamic = 'force-dynamic'; // Ensure no caching

async function getHomePageData() {
  try {
    await dbConnect();

    // Fetch all data in parallel for speed
    const [
      destinations,
      tours,
      categories,
      allCategories,
      attractionPages,
      categoryPages,
      headerDestinations,
      headerCategories,
      heroSettings,
      dayTrips
    ] = await Promise.all([
      // Destinations with tour count
      Destination.find({ isPublished: true })
        .select('name slug image description country')
        .limit(8)
        .lean(),

      // Featured tours
      Tour.find({ isPublished: true, isFeatured: true })
        .populate('destination', 'name')
        .select('title slug image discountPrice originalPrice duration rating bookings')
        .limit(8)
        .lean(),

      // Categories for InterestGrid (will add tour counts below)
      Category.find({ isPublished: true })
        .select('name slug icon description')
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
        .select('name slug image description country')
        .lean(),

      // Header categories (featured)
      Category.find({ isPublished: true, featured: true })
        .select('name slug icon description')
        .lean(),

      // Hero settings
      HeroSettings.findOne({ isActive: true })
        .select('backgroundImages currentActiveImage title searchSuggestions floatingTags trustIndicators overlaySettings animationSettings metaTitle metaDescription')
        .lean(),

      // Day trips (all published tours, limited to 12)
      Tour.find({ isPublished: true })
        .select('title slug image discountPrice originalPrice duration rating bookings tags')
        .limit(12)
        .lean()
    ]);

    // Calculate tour counts for destinations
    const destinationsWithCounts = await Promise.all(
      destinations.map(async (dest) => {
        const count = await Tour.countDocuments({
          destination: dest._id,
          isPublished: true
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
          isPublished: true
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
          isPublished: true
        });
        return {
          type: 'category' as const,
          name: category.name,
          slug: category.slug,
          products: tourCount,
          _id: JSON.parse(JSON.stringify(category._id)),
          image: category.heroImage,
          featured: category.featured
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
            $or: searchQueries
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

    return {
      destinations: destinationsWithCounts,
      tours: JSON.parse(JSON.stringify(tours)),
      categories: interestGridCategories,
      featuredInterests,
      categoryPages: JSON.parse(JSON.stringify(categoryPages)),
      headerDestinations: JSON.parse(JSON.stringify(headerDestinations)),
      headerCategories: JSON.parse(JSON.stringify(headerCategories)),
      heroSettings: heroSettings ? JSON.parse(JSON.stringify(heroSettings)) : null,
      dayTrips: JSON.parse(JSON.stringify(dayTrips))
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
  } = await getHomePageData();

  return (
    <main>
      <ReviewsStructuredData />
      <Header
        initialDestinations={headerDestinations}
        initialCategories={headerCategories}
      />
      <HeroSection initialSettings={heroSettings} />

      {/* Pass pre-fetched data as props */}
      <DestinationsServer destinations={destinations} />
      <IcebarPromo />
      <FeaturedToursServer tours={tours} />
      <PopularInterestServer interests={featuredInterests} categoryPages={categoryPages} />
      <InterestGridServer categories={categories} />
      <DayTripsServer tours={dayTrips} />

      <AboutUs />
      <Reviews />
      <FAQ />
      <Footer />
      <AISearchWidget />
    </main>
  );
}
