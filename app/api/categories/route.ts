// app/api/categories/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

export async function GET() {
  try {
    await dbConnect();
    
    const categories = await Category.find({})
      .sort({ order: 1, name: 1 })
      .lean();

    // Optionally add tour counts
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const tourCount = await Tour.countDocuments({
          category: { $in: [category._id] },
          isPublished: true
        });
        
        return {
          ...category,
          tourCount
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: categoriesWithCounts 
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch categories' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({
        success: false,
        error: 'Name and slug are required'
      }, { status: 400 });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug: body.slug });
    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Slug already exists'
      }, { status: 400 });
    }

    const category = new Category(body);
    await category.save();

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create category'
    }, { status: 500 });
  }
}