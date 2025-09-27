import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import Review from '@/lib/models/Review';
import User from '@/lib/models/user';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await dbConnect();

    const slug = params.slug;
    console.log('Fetching attraction page with slug:', slug);
    
    // Find the attraction page by slug
    const page = await AttractionPage.findOne({ 
      slug, 
      isPublished: true 
    }).lean();

    if (!page) {
      console.log('Page not found for slug:', slug);
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }

    // Populate category if exists
    let populatedPage = { ...page };
    if (page.categoryId) {
      try {
        const category = await Category.findById(page.categoryId).select('name slug').lean();
        populatedPage.categoryId = category;
      } catch (error) {
        console.error('Error populating category:', error);
        populatedPage.categoryId = null;
      }
    }

    let tours = [];
    let totalTours = 0;

    if (populatedPage.pageType === 'category' && populatedPage.categoryId) {
      console.log('Fetching tours for category:', populatedPage.categoryId);
      
      // For category pages, fetch tours from that category
      tours = await Tour.find({
        category: populatedPage.categoryId._id || populatedPage.categoryId,
        isPublished: true
      })
      .populate({
        path: 'destination',
        model: Destination,
        select: 'name slug country image description'
      })
      .populate({
        path: 'category',
        model: Category,
        select: 'name slug'
      })
      .sort({ isFeatured: -1, rating: -1, bookings: -1 })
      .lean();

      totalTours = await Tour.countDocuments({
        category: populatedPage.categoryId._id || populatedPage.categoryId,
        isPublished: true
      });
    } else if (populatedPage.pageType === 'attraction') {
      console.log('Fetching tours for attraction:', populatedPage.title);
      
      // For attraction pages, find tours by title/description/keywords matching
      const searchTerms = [
        populatedPage.title,
        ...(populatedPage.keywords || []),
        ...(populatedPage.highlights || [])
      ].filter(Boolean);

      if (searchTerms.length > 0) {
        const searchQueries = [];

        // Direct title match
        searchQueries.push({ title: { $regex: new RegExp(populatedPage.title, 'i') } });
        
        // Description match
        searchQueries.push({ description: { $regex: new RegExp(populatedPage.title, 'i') } });
        
        // Keywords match
        if (populatedPage.keywords && populatedPage.keywords.length > 0) {
          searchQueries.push({ tags: { $in: populatedPage.keywords } });
          searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(populatedPage.keywords.join('|'), 'i') } } });
        }
        
        // Highlights match
        if (populatedPage.highlights && populatedPage.highlights.length > 0) {
          searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(populatedPage.highlights.join('|'), 'i') } } });
        }

        // Text search
        const searchText = searchTerms.join(' ');
        if (searchText.trim()) {
          searchQueries.push({ $text: { $search: searchText } });
        }

        tours = await Tour.find({
          $and: [
            { isPublished: true },
            { $or: searchQueries }
          ]
        })
        .populate({
          path: 'destination',
          model: Destination,
          select: 'name slug country image description'
        })
        .populate({
          path: 'category',
          model: Category,
          select: 'name slug'
        })
        .sort({ isFeatured: -1, rating: -1, bookings: -1 })
        .limit(50) // Limit for attraction pages
        .lean();

        totalTours = tours.length;
      }
    }

    console.log(`Found ${tours.length} tours for page`);

    // Fetch reviews for the tours
    const tourIds = tours.map(tour => tour._id);
    let reviews = [];
    let reviewStats = [];

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
      .lean();

      // Calculate review counts and average ratings for each tour
      reviewStats = await Review.aggregate([
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
    }, {});

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
      ...populatedPage,
      tours,
      totalTours,
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