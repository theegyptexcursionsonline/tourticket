import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';

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

    // Get basic interest info by searching through categories
    const categories = await Category.find({
      name: { $regex: new RegExp(interestName, 'i') }
    }).lean();

    // Find related attraction pages
    const attractionPages = await AttractionPage.find({
      isPublished: true,
      $or: [
        { title: { $regex: new RegExp(interestName, 'i') } },
        { description: { $regex: new RegExp(interestName, 'i') } }
      ]
    }).populate('categoryId').lean();

    // Mock tours data (replace with actual tour model query)
    const tours = await mockGetTours(interestName);

    // Related categories
    const relatedCategories = await Category.find({
      name: { $ne: interestName }
    }).limit(6).lean();

    const interestData = {
      name: interestName,
      slug: slug,
      description: `Discover amazing ${interestName.toLowerCase()} experiences in Egypt`,
      tours: tours,
      attractionPages: attractionPages,
      categories: categories,
      relatedCategories: relatedCategories,
      stats: {
        totalTours: tours.length,
        totalAttractions: attractionPages.length,
        averageRating: 4.5,
        totalReviews: Math.floor(Math.random() * 500) + 100
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

// Mock function - replace with actual tour model query
async function mockGetTours(interestName: string) {
  // This should be replaced with actual database query to your tours collection
  return [
    {
      _id: '1',
      title: `Amazing ${interestName} Experience`,
      description: `Join us for an unforgettable ${interestName.toLowerCase()} adventure`,
      price: 150,
      duration: '4 hours',
      rating: 4.8,
      reviewCount: 124,
      image: '/images/tour-placeholder.jpg',
      location: 'Cairo'
    },
    {
      _id: '2',
      title: `Premium ${interestName} Tour`,
      description: `Luxury ${interestName.toLowerCase()} experience with expert guides`,
      price: 250,
      duration: '6 hours',
      rating: 4.9,
      reviewCount: 89,
      image: '/images/tour-placeholder.jpg',
      location: 'Luxor'
    }
  ];
}