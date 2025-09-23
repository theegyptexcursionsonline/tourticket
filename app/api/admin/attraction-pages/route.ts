import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();
    
    const pages = await AttractionPage.find()
      .populate({
        path: 'categoryId',
        model: Category,
        select: 'name slug'
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      data: pages 
    });
  } catch (error) {
    console.error('Error fetching attraction pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction pages' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'pageType', 'heroImage', 'gridTitle'];
    const missingFields = requiredFields.filter(field => !data[field]?.trim?.());
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Auto-generate slug if not provided
    if (!data.slug && data.title) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }

    // Filter empty array items
    if (data.highlights) {
      data.highlights = data.highlights.filter((item: string) => item && item.trim());
    }
    if (data.features) {
      data.features = data.features.filter((item: string) => item && item.trim());
    }
    if (data.images) {
      data.images = data.images.filter((item: string) => item && item.trim());
    }
    if (data.keywords) {
      data.keywords = data.keywords.filter((item: string) => item && item.trim());
    }

    const page = await AttractionPage.create(data);
    
    // Populate category if needed
    const populatedPage = await AttractionPage.findById(page._id)
      .populate({
        path: 'categoryId',
        model: Category,
        select: 'name slug'
      });

    return NextResponse.json({ 
      success: true, 
      data: populatedPage,
      message: 'Attraction page created successfully' 
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating attraction page:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      return NextResponse.json({ 
        success: false, 
        error: `A page with this ${field} already exists` 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ 
        success: false, 
        error: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create attraction page' 
    }, { status: 500 });
  }
}