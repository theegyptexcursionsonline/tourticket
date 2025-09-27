import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
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
    
    // Convert slug back to name (adventure-tour -> Adventure Tour)
    const interestName = slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log('Looking for interest:', interestName, 'with slug:', slug);

    // Find the category by name or slug
    const category = await Category.findOne({
      $or: [
        { slug: slug },
        { name: { $regex: new RegExp(`^${interestName}$`, 'i') } }
      ]
    }).lean();

    console.log('Found category:', category);

    let tours = [];
    let totalTours = 0;

    if (category) {
      // Find tours in this category
      tours = await Tour.find({
        category: category._id,
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
        category: category._id,
        isPublished: true
      });
    } else {
      // If no exact category match, search by keywords in tours
      const searchTerms = interestName.split(' ');
      const searchRegex = new RegExp(searchTerms.join('|'), 'i');

      tours = await Tour.find({
        $and: [
          { isPublished: true },
          {
            $or: [
              { title: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              { tags: { $in: searchTerms.map(term => new RegExp(term, 'i')) } },
              { highlights: { $elemMatch: { $regex: searchRegex } } }
            ]
          }
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
      .limit(50)
      .lean();

      totalTours = tours.length;
    }

    console.log('Found tours:', tours.length);

    // Fetch reviews for these tours
    const tourIds = tours.map(tour => tour._id);
    const reviews = await Review.find({
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

    // Calculate review stats
    const reviewStats = await Review.aggregate([
      { $match: { tour: { $in: tourIds } } },
      { 
        $group: { 
          _id: '$tour', 
          count: { $sum: 1 }, 
          avgRating: { $avg: '$rating' } 
        } 
      }
    ]);

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

    // Get related categories
    const relatedCategories = await Category.find({
      _id: { $ne: category?._id }
    }).limit(6).lean();

    const interestData = {
      name: interestName,
      slug: slug,
      description: `Discover amazing ${interestName.toLowerCase()} experiences in Egypt`,
      longDescription: `Explore our curated collection of ${interestName.toLowerCase()} tours and experiences. From budget-friendly options to luxury adventures, find the perfect way to experience Egypt's incredible ${interestName.toLowerCase()}.`,
      category: category,
      tours: tours,
      totalTours: totalTours,
      reviews: reviews.slice(0, 20),
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
        totalReviews: reviews.length,
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
      error: 'Failed to fetch interest data'
    }, { status: 500 });
  }
}