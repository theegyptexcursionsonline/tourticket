import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import {
  ATTRACTION_PAGE_LOCALIZED_FIELDS,
  resolveAttractionPageTours,
  resolveLinkedPageCards,
} from '@/lib/attractionPages/pageContent';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { localizeEntityFields, localizeStructuredEntries } from '@/lib/i18n/contentLocalization';
import { attractionPageStructuredFields } from '@/lib/i18n/translationFields';

interface CategorySummary {
  _id: unknown;
  name: string;
  slug: string;
}

interface AttractionPageView {
  _id: unknown;
  pageType: 'category' | 'attraction';
  categoryId?: unknown | CategorySummary | null;
  title: string;
  keywords?: string[];
  highlights?: string[];
}

interface TourView {
  _id: { toString(): string };
  title: string;
  image: string;
  rating?: number;
}

interface ReviewView {
  user?: { firstName?: string; lastName?: string; picture?: string } | null;
  userName?: string;
}

interface ReviewStat {
  _id: { toString(): string };
  count: number;
  avgRating: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();

    const { slug } = await params;
    console.log('Fetching attraction page with slug:', slug);
    
    // Find the attraction page by slug
    const page = await AttractionPage.findOne({ 
      slug, 
      isPublished: true,
      ...DEFAULT_TENANT_FILTER,
    }).lean();

    if (!page) {
      console.log('Page not found for slug:', slug);
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }

    // Populate category if exists
    const populatedPage = { ...page } as unknown as AttractionPageView;
    if (page.categoryId) {
      try {
        const category = await Category.findOne({
          $and: [DEFAULT_TENANT_FILTER, { _id: page.categoryId }],
        }).select('name slug').lean();
        populatedPage.categoryId = category;
      } catch (error) {
        console.error('Error populating category:', error);
        populatedPage.categoryId = null;
      }
    }

    // Shared resolution: admin-curated linkedTourIds first, then the
    // category/attraction/keyword/featured ladder (lib/attractionPages/pageContent).
    const [resolved, linkedPages] = await Promise.all([
      resolveAttractionPageTours(page as unknown as Parameters<typeof resolveAttractionPageTours>[0]),
      resolveLinkedPageCards(
        page as unknown as Parameters<typeof resolveLinkedPageCards>[0],
        request.nextUrl.searchParams.get('locale') || 'en',
      ),
    ]);
    let tours = resolved.tours as unknown as TourView[];
    const totalTours = resolved.totalTours;

    console.log(`Found ${tours.length} tours for page`);

    // Fetch reviews for the tours
    const tourIds = tours.map(tour => tour._id);
    let reviews: ReviewView[] = [];
    let reviewStats: ReviewStat[] = [];

    if (tourIds.length > 0) {
      reviews = await Review.find({
        tour: { $in: tourIds }
      })
      .populate({
        path: 'user',
        model: User,
        select: 'firstName lastName picture'
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean() as unknown as ReviewView[];

      // Calculate review counts and average ratings for each tour
      reviewStats = await Review.aggregate<ReviewStat>([
        { $match: { tour: { $in: tourIds } } },
        { 
          $group: { 
            _id: '$tour', 
            count: { $sum: 1 }, 
            avgRating: { $avg: '$rating' } 
          } 
        }
      ]);
    }

    const reviewStatsMap = reviewStats.reduce((acc, item) => {
      acc[item._id.toString()] = {
        count: item.count,
        avgRating: Math.round(item.avgRating * 10) / 10
      };
      return acc;
    }, {} as Record<string, { count: number; avgRating: number }>);

    // Update tours with review data
    tours = tours.map(tour => ({
      ...tour,
      reviewCount: reviewStatsMap[tour._id.toString()]?.count || 0,
      rating: reviewStatsMap[tour._id.toString()]?.avgRating || tour.rating || 4.5
    }));

    // Transform reviews to include user names
    const transformedReviews = reviews.map(review => ({
      ...review,
      userName: review.user 
        ? `${review.user.firstName} ${review.user.lastName}`.trim()
        : review.userName || 'Anonymous',
      userAvatar: review.user?.picture || null
    }));

    const responseData = {
      ...localizeEntityFields(
        localizeStructuredEntries(
          JSON.parse(JSON.stringify(populatedPage)) as Record<string, unknown>,
          request.nextUrl.searchParams.get('locale') || 'en',
          attractionPageStructuredFields,
        ),
        request.nextUrl.searchParams.get('locale') || 'en',
        ATTRACTION_PAGE_LOCALIZED_FIELDS,
      ),
      tours,
      totalTours,
      linkedPages,
      reviews: transformedReviews
    };

    console.log('Successfully fetched attraction page data');

    return NextResponse.json({ 
      success: true, 
      data: responseData 
    });
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch page data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
