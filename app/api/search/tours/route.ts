import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import mongoose from 'mongoose';

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);

        const pipeline: any[] = [];

        // --- Text Search Stage ---
        const searchQuery = searchParams.get('q');
        if (searchQuery) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: searchQuery, $options: 'i' } },
                        { description: { $regex: searchQuery, $options: 'i' } },
                        { location: { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            });
        }

        const matchStage: any = {};

        // --- Categories Filter ---
        const categories = searchParams.get('categories');
        if (categories) {
            try {
                matchStage.category = { $in: categories.split(',').map(id => new mongoose.Types.ObjectId(id)) };
            } catch (error) {
                console.warn("Invalid category ID format", error);
            }
        }

        // --- Destinations Filter ---
        const destinations = searchParams.get('destinations');
        if (destinations) {
            try {
                matchStage.destination = { $in: destinations.split(',').map(id => new mongoose.Types.ObjectId(id)) };
            } catch (error) {
                console.warn("Invalid destination ID format", error);
            }
        }

        // --- Price Filter ---
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        if (minPrice || maxPrice) {
            const priceQuery: any = {};
            if (minPrice) priceQuery.$gte = Number(minPrice);
            if (maxPrice) priceQuery.$lte = Number(maxPrice);
            // Check against either discountPrice or the regular price
            matchStage.$or = [
                { discountPrice: priceQuery },
                { price: priceQuery }
            ];
        }

        // --- Duration Filter ---
        const durations = searchParams.get('durations');
        if (durations) {
            const durationConditions = durations.split(',').map(range => {
                const [min, max] = range.split('-').map(Number);
                if (!isNaN(min) && !isNaN(max)) {
                    return { duration: { $gte: min, $lte: max } };
                }
                return null;
            }).filter(Boolean);

            if (durationConditions.length > 0) {
                matchStage.duration = { $or: durationConditions.map(c => c!.duration) };
            }
        }

        // --- Ratings Filter ---
        const ratings = searchParams.get('ratings');
        if (ratings) {
            const ratingValues = ratings.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
            if (ratingValues.length > 0) {
                // Find the minimum rating selected (e.g., if '3 stars & up' and '4 stars & up' are chosen, filter by >= 3)
                matchStage.rating = { $gte: Math.min(...ratingValues) };
            }
        }

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // --- Sorting ---
        let sortOption: any = { bookings: -1, rating: -1 }; // Default: popularity
        const sortBy = searchParams.get('sortBy');
        if (sortBy === 'price-asc') {
            sortOption = { discountPrice: 1, price: 1 };
        } else if (sortBy === 'price-desc') {
            sortOption = { discountPrice: -1, price: -1 };
        } else if (sortBy === 'rating') {
            sortOption = { rating: -1 };
        }
        
        pipeline.push({ $sort: sortOption });
        
        // --- Populate and Limit ---
        pipeline.push({ $limit: 50 });

        const tours = await Tour.aggregate(pipeline).exec();
        
        // Mongoose aggregate doesn't run populate, so we do it manually after
        await Tour.populate(tours, [
            { path: 'category', select: 'name' },
            { path: 'destination', select: 'name' }
        ]);

        return NextResponse.json(tours);
    } catch (error) {
        console.error('Error fetching tours:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
    }
}