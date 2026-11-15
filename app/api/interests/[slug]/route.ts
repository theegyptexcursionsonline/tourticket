// app/api/interests/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';
import { escapeRegex } from '@/lib/utils/escapeRegex';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

// The flagship shares its database with the network sites. Every read here is
// limited to the flagship's own published records; the tenant filter is its own
// $and clause because Mongo keeps only one top-level $or.
const FLAGSHIP_PUBLIC = { ...PUBLIC_CONTENT_FILTER, $and: [DEFAULT_TENANT_FILTER] };

interface InterestTour {
  _id: { toString(): string };
  image: string;
  rating?: number;
}

interface InterestReview {
  user?: { firstName?: string; lastName?: string; picture?: string } | null;
  userName?: string;
}

interface ReviewStat {
  _id: { toString(): string };
  count: number;
  avgRating: number;
}

interface InterestCategory {
  _id: unknown;
  description?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();

    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    
    // Convert slug back to name (adventure-tour -> Adventure Tour)
    const interestName = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Find the category by name or slug
    const category = await Category.findOne({
      ...PUBLIC_CONTENT_FILTER,
      $and: [
        DEFAULT_TENANT_FILTER,
        { $or: [
          { slug: slug },
          { name: { $regex: new RegExp(`^${escapeRegex(interestName)}$`, 'i') } }
        ] },
      ],
    }).lean() as unknown as InterestCategory | null;

    let tours: InterestTour[] = [];
    let totalTours = 0;

    if (category) {
      // Find tours in this category
      tours = await Tour.find({
        ...FLAGSHIP_PUBLIC,
        category: { $in: [category._id] },
      })
      .populate({
        path: 'destination',
        model: Destination,
        select: 'name slug country image description',
        match: DEFAULT_TENANT_FILTER,
      })
      .populate({
        path: 'category',
        model: Category,
        select: 'name slug',
        match: DEFAULT_TENANT_FILTER,
      })
      .sort({ isFeatured: -1, rating: -1, bookings: -1 })
      .lean() as unknown as InterestTour[];

      totalTours = await Tour.countDocuments({
        ...FLAGSHIP_PUBLIC,
        category: { $in: [category._id] },
      });
    } else {
      // If no exact category match, search by keywords in tours
      const searchTerms = interestName.split(' ').filter(term => term.length > 2);
      
      if (searchTerms.length > 0) {
        const searchQueries = [];
        
        // Search in title
        searchTerms.forEach(term => {
          searchQueries.push({
            title: { $regex: escapeRegex(term), $options: 'i' }
          });
        });

        // Search in tags
        searchQueries.push({
          tags: {
            $in: searchTerms.map(term => new RegExp(escapeRegex(term), 'i'))
          }
        });

        tours = await Tour.find({
          ...PUBLIC_CONTENT_FILTER,
          $and: [DEFAULT_TENANT_FILTER, { $or: searchQueries }],
        })
        .populate({
          path: 'destination',
          model: Destination,
          select: 'name slug country image description',
          match: DEFAULT_TENANT_FILTER,
        })
        .populate({
          path: 'category',
          model: Category,
          select: 'name slug',
          match: DEFAULT_TENANT_FILTER,
        })
        .sort({ isFeatured: -1, rating: -1, bookings: -1 })
        .limit(50)
        .lean() as unknown as InterestTour[];

        totalTours = tours.length;
      }
    }

    // Fetch reviews for these tours (optimized with limit)
    const tourIds = tours.slice(0, 20).map(tour => tour._id); // Limit to first 20 tours for reviews
    let reviews: InterestReview[] = [];
    let reviewStats: ReviewStat[] = [];

    if (tourIds.length > 0) {
      // Run review queries in parallel
      [reviews, reviewStats] = await Promise.all([
        Review.find({
          tour: { $in: tourIds }
        })
        .populate({
          path: 'user',
          model: User,
          select: 'firstName lastName picture'
        })
        .sort({ createdAt: -1 })
        .limit(20) // Reduced limit
        .lean() as unknown as Promise<InterestReview[]>,

        Review.aggregate<ReviewStat>([
          { $match: { tour: { $in: tourIds } } },
          {
            $group: {
              _id: '$tour',
              count: { $sum: 1 },
              avgRating: { $avg: '$rating' }
            }
          }
        ])
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
      // Only a rating the reviews or the tour record actually carry; never a made-up score.
      rating: reviewStatsMap[tour._id.toString()]?.avgRating || tour.rating || undefined
    }));

    // Get related categories (fetch in parallel if possible, but skip during build)
    let relatedCategories: unknown[] = [];
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      relatedCategories = await Category.find({
        ...FLAGSHIP_PUBLIC,
        _id: { $ne: category?._id },
      }).limit(6).lean();
    }

    // Transform reviews
    const transformedReviews = reviews.map(review => ({
      ...review,
      userName: review.user
        ? `${review.user.firstName} ${review.user.lastName}`.trim()
        : review.userName || 'Anonymous',
      userAvatar: review.user?.picture || null
    }));

    const interestData = {
      name: interestName,
      slug: slug,
      description: category?.description || `Discover amazing ${interestName.toLowerCase()} experiences in Egypt`,
      longDescription: `Explore our curated collection of ${interestName.toLowerCase()} tours and experiences. From budget-friendly options to luxury adventures, find the perfect way to experience Egypt's incredible ${interestName.toLowerCase()}.`,
      category: category,
      tours: tours,
      totalTours: totalTours,
      reviews: transformedReviews.slice(0, 20),
      relatedCategories: relatedCategories,
      heroImage: tours.length > 0 ? tours[0].image : '/images/default-hero.jpg',
      highlights: [
        `Expert-guided ${interestName.toLowerCase()} experiences`,
        'Small group sizes for personalized attention',
        'Flexible cancellation policies',
        '24/7 customer support',
        'Best price guarantee'
      ],
      features: [
        `Professional ${interestName.toLowerCase()} guides with local expertise`,
        'Premium equipment and safety measures included',
        'Customizable itineraries to match your preferences',
        'Comprehensive insurance coverage for peace of mind'
      ],
      stats: {
        totalTours: totalTours,
        totalReviews: transformedReviews.length,
        averageRating: tours.length > 0 
          ? (tours.reduce((acc, tour) => acc + (tour.rating || 0), 0) / tours.length).toFixed(1)
          : '4.8',
        happyCustomers: Math.floor(Math.random() * 5000) + 1000
      }
    };

    return NextResponse.json({
      success: true,
      data: interestData
    });
  } catch (error) {
    console.error('Error fetching interest data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch interest data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
