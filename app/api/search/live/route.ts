import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('q');

    if (!searchQuery) {
      // Return tours based on other filters if no search query is provided
      const query: any = {};

      const categories = searchParams.get('categories');
      if (categories) {
          try {
              query.category = { $in: categories.split(',').map(id => new mongoose.Types.ObjectId(id)) };
          } catch (error) {
              console.warn("Invalid category ID format", error);
          }
      }

      const destinations = searchParams.get('destinations');
      if (destinations) {
          try {
              query.destination = { $in: destinations.split(',').map(id => new mongoose.Types.ObjectId(id)) };
          } catch (error) {
              console.warn("Invalid destination ID format", error);
          }
      }

      const minPrice = searchParams.get('minPrice');
      const maxPrice = searchParams.get('maxPrice');
      if (minPrice || maxPrice) {
          query.discountPrice = {};
          if (minPrice) query.discountPrice.$gte = Number(minPrice);
          if (maxPrice) query.discountPrice.$lte = Number(maxPrice);
      }

      const ratings = searchParams.get('ratings');
      if (ratings) {
          const ratingValues = ratings.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
          if(ratingValues.length > 0) {
            query.rating = { $gte: Math.min(...ratingValues) };
          }
      }
      
      let sortOption: any = { bookings: -1, rating: -1 }; // Default sort
      const sortBy = searchParams.get('sortBy');
      if (sortBy === 'price-asc') {
          sortOption = { discountPrice: 1 };
      } else if (sortBy === 'price-desc') {
          sortOption = { discountPrice: -1 };
      } else if (sortBy === 'rating') {
          sortOption = { rating: -1 };
      }

      const tours = await Tour.find(query)
          .populate('category', 'name')
          .populate('destination', 'name')
          .sort(sortOption)
          .limit(50)
          .lean();

      return NextResponse.json({ success: true, data: tours });
    }

    // If there IS a search query, perform a text-based search
    const tours = await Tour.find({
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $regex: searchQuery, $options: 'i' } }
      ],
    })
    .select('title slug image rating reviews destination') // Select only the necessary fields
    .populate('destination', 'name')
    .limit(10)
    .lean();

    return NextResponse.json({ success: true, data: tours });

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
  }
}