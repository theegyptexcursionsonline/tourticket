// app/api/search/tours/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);

        const query: any = {};

        const searchQuery = searchParams.get('q');
        if (searchQuery) {
            query.title = { $regex: searchQuery, $options: 'i' };
        }

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

        const durations = searchParams.get('durations');
        if (durations) {
            // Backend filtering for duration strings is complex and has been omitted for now.
            // This can be implemented later with more advanced data structures.
        }

        const ratings = searchParams.get('ratings');
        if (ratings) {
            const ratingValues = ratings.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            if(ratingValues.length > 0) {
              query.rating = { $gte: Math.min(...ratingValues) };
            }
        }

        let sortOption: any = { bookings: -1, rating: -1 }; // Default sort by popularity/rating
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
            .limit(50) // Add a limit to prevent excessively large responses
            .lean();

        return NextResponse.json(tours);
    } catch (error) {
        console.error('Error fetching tours:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
    }
}