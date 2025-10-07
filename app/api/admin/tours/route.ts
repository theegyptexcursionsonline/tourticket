// app/api/admin/tours/route.ts
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';
import { getCachedData, invalidateCache, cacheConfig, cacheKeys } from '@/lib/redis';

// Helper function to clean booking options
function cleanBookingOptions(bookingOptions: any[]): any[] {
  if (!Array.isArray(bookingOptions)) return [];
  
  return bookingOptions.map(option => {
    const cleanedOption = { ...option };
    
    // Remove empty or invalid difficulty values
    if (!cleanedOption.difficulty || cleanedOption.difficulty.trim() === '') {
      delete cleanedOption.difficulty;
    } else {
      const validDifficulties = ['Easy', 'Moderate', 'Challenging', 'Difficult'];
      if (!validDifficulties.includes(cleanedOption.difficulty)) {
        delete cleanedOption.difficulty;
      }
    }
    
    // Clean other optional fields
    if (!cleanedOption.badge || cleanedOption.badge.trim() === '') {
      delete cleanedOption.badge;
    }
    
    if (!cleanedOption.description || cleanedOption.description.trim() === '') {
      delete cleanedOption.description;
    }
    
    if (!cleanedOption.duration || cleanedOption.duration.trim() === '') {
      delete cleanedOption.duration;
    }
    
    if (!cleanedOption.groupSize || cleanedOption.groupSize.trim() === '') {
      delete cleanedOption.groupSize;
    }
    
    // Ensure arrays are properly handled
    if (!Array.isArray(cleanedOption.languages)) {
      cleanedOption.languages = [];
    }
    
    if (!Array.isArray(cleanedOption.highlights)) {
      cleanedOption.highlights = [];
    }
    
    // Ensure numeric fields are properly typed
    if (cleanedOption.price) {
      cleanedOption.price = Number(cleanedOption.price);
    }
    
    if (cleanedOption.originalPrice) {
      cleanedOption.originalPrice = Number(cleanedOption.originalPrice);
    }
    
    if (cleanedOption.discount) {
      cleanedOption.discount = Number(cleanedOption.discount);
    }
    
    return cleanedOption;
  });
}

async function fetchToursWithPopulate() {
  try {
    return await Tour.find({})
      .populate('category')
      .populate('destination')
      .populate('reviews')
      .populate('attractions')
      .populate('interests')
      .lean();
  } catch (err) {
    console.warn('Populate failed, retrying with strictPopulate:false', err);
    return await Tour.find({})
      .populate({ path: 'category', strictPopulate: false })
      .populate({ path: 'destination', strictPopulate: false })
      .populate({ path: 'reviews', strictPopulate: false })
      .populate({ path: 'attractions', strictPopulate: false })
      .populate({ path: 'interests', strictPopulate: false })
      .lean();
  }
}

// GET all tours with caching
export async function GET() {
  await dbConnect();
  
  try {
    const tours = await getCachedData(
      cacheKeys.tours.all(),
      async () => {
        return await fetchToursWithPopulate();
      },
      cacheConfig.MEDIUM // Cache for 5 minutes
    );

    return NextResponse.json({ success: true, data: tours }, { status: 200 });
  } catch (error) {
    console.error('Error fetching tours:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST a new tour
export async function POST(request: Request) {
  await dbConnect();
  
  try {
    const body = await request.json();
    
    // Map 'faqs' from form to 'faq' in the database model
    if (body.faqs) {
      body.faq = body.faqs;
      delete body.faqs;
    }

    // Clean booking options to remove invalid enum values
    if (body.bookingOptions && Array.isArray(body.bookingOptions)) {
      body.bookingOptions = cleanBookingOptions(body.bookingOptions);
    }

    // Handle attractions and interests arrays
    if (body.attractions && Array.isArray(body.attractions)) {
      body.attractions = body.attractions.filter(id => id && id.trim());
    }
    if (body.interests && Array.isArray(body.interests)) {
      body.interests = body.interests.filter(id => id && id.trim());
    }

    const tour = await Tour.create(body);
    
    let populated = tour;
    try {
      populated = await Tour.findById(tour._id)
        .populate('category')
        .populate('destination')
        .populate('reviews')
        .populate('attractions')
        .populate('interests')
        .lean();
    } catch (popErr) {
      console.warn('Populate after create failed, returning raw tour', popErr);
    }

    // Invalidate all tour-related caches
    await invalidateCache('tours:*');
    await invalidateCache('destinations:*');
    await invalidateCache('attractions-interests:*');

    return NextResponse.json({ success: true, data: populated ?? tour }, { status: 201 });
  } catch (error) {
    console.error('Error creating tour:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}