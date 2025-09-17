// app/api/admin/tours/[id]/route.ts
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { NextResponse } from 'next/server';

interface Params {
  id: string;
}

// GET a single tour by ID
export async function GET(request: Request, { params }: { params: Params }) {
    await dbConnect();
    try {
        const tour = await Tour.findById(params.id).populate('destination').populate('category');
        if (!tour) {
            return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: tour });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
    }
}

// PUT (update) a tour - Enhanced with validation
export async function PUT(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const body = await request.json();
    const { id } = params;

    // Server-side validation for essential fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json({ success: false, error: 'Tour title is required' }, { status: 400 });
    }

    if (!body.slug || typeof body.slug !== 'string' || body.slug.trim() === '') {
      return NextResponse.json({ success: false, error: 'Tour slug is required' }, { status: 400 });
    }

    if (!body.discountPrice || typeof body.discountPrice !== 'number' || body.discountPrice <= 0) {
      return NextResponse.json({ success: false, error: 'Valid discount price is required' }, { status: 400 });
    }

    if (!body.destination || typeof body.destination !== 'string') {
      return NextResponse.json({ success: false, error: 'Destination is required' }, { status: 400 });
    }

    if (!body.categories || !Array.isArray(body.categories) || body.categories.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one category is required' }, { status: 400 });
    }

    // Get the existing tour to check if slug is changing
    const existingTour = await Tour.findById(id);
    if (!existingTour) {
      return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
    }

    // Sanitize the slug
    const sanitizedSlug = body.slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check slug uniqueness if it's different from current slug
    if (sanitizedSlug !== existingTour.slug) {
      const slugExists = await Tour.findOne({ 
        slug: sanitizedSlug, 
        _id: { $ne: id } 
      });
      
      if (slugExists) {
        return NextResponse.json({ 
          success: false, 
          error: 'Slug is already in use by another tour' 
        }, { status: 409 });
      }
    }

    // Update the body with sanitized slug
    const updateData = {
      ...body,
      slug: sanitizedSlug,
      category: body.categories[0], // Use first category as singular category
    };

    // Clean up arrays by removing empty strings
    if (updateData.whatsIncluded) {
      updateData.whatsIncluded = updateData.whatsIncluded.filter((item: string) => item.trim() !== '');
    }
    if (updateData.whatsNotIncluded) {
      updateData.whatsNotIncluded = updateData.whatsNotIncluded.filter((item: string) => item.trim() !== '');
    }

    // Only proceed with update if all validations pass
    const tour = await Tour.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!tour) {
      return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tour });
  } catch (error) {
    console.error('Error updating tour:', error);
    
    // Handle duplicate key errors
    if ((error as any).code === 11000) {
      const field = Object.keys((error as any).keyValue || {})[0] || 'field';
      return NextResponse.json({ 
        success: false, 
        error: `A tour with this ${field} already exists` 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 400 });
  }
}

// DELETE a tour
export async function DELETE(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const deletedTour = await Tour.deleteOne({ _id: params.id });
    if (deletedTour.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Tour not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}