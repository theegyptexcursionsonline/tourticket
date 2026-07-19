import dbConnect from '@/lib/dbConnect';
import Tour, { type ITour } from '@/lib/models/Tour';
import { NextRequest, NextResponse } from 'next/server';
import mongoose, { type FilterQuery } from 'mongoose';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

// Helper function for flexible live search
function createLiveSearchConditions(searchQuery: string) {
    if (!searchQuery) return null;
    
    const keywords = searchQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1); // More lenient for live search
    
    if (keywords.length === 0) return null;
    
    // For live search, we want broader matches
    const conditions = keywords.map(keyword => ({
        $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { location: { $regex: keyword, $options: 'i' } },
            { tags: { $regex: keyword, $options: 'i' } }
        ]
    }));
    
    return { $or: conditions };
}

export async function GET(req: NextRequest) {
    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const searchQuery = searchParams.get('q');

        // Only show tours from the default tenant (exclude German/other tenant tours)
        if (!searchQuery) {
            // Return tours based on filters when no search query
            const query: FilterQuery<ITour> = { isPublished: true, ...DEFAULT_TENANT_FILTER };

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
                if (ratingValues.length > 0) {
                    query.rating = { $gte: Math.min(...ratingValues) };
                }
            }
            
            let sortOption: Record<string, 1 | -1> = { bookings: -1, rating: -1 };
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

        // Enhanced live search with flexible matching
        const searchConditions = createLiveSearchConditions(searchQuery);
        
        if (!searchConditions) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Keep both OR clauses. Spreading the tenant filter over the search
        // conditions used to overwrite the keyword clause, returning unrelated
        // records and allowing stale cross-tenant Algolia results to dominate.
        const tours = await Tour.find({
            isPublished: true,
            $and: [searchConditions, DEFAULT_TENANT_FILTER],
        })
            .select('title slug image rating reviews reviewCount destination location tags duration price discountPrice tenantId')
            .populate('destination', 'name')
            .sort({ rating: -1, bookings: -1 }) // Prioritize high-rated popular tours
            .limit(10)
            .lean();

        return NextResponse.json({ success: true, data: tours });

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ success: false, message: 'Server Error', error: errorMessage }, { status: 500 });
    }
}
