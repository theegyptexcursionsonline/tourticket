import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();
    
    const categoryPages = await AttractionPage.find({ 
      isPublished: true,
      pageType: 'category'
    })
      .populate({
        path: 'categoryId',
        model: Category,
        select: 'name slug'
      })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      data: categoryPages 
    });
  } catch (error) {
    console.error('Error fetching category pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch category pages' 
    }, { status: 500 });
  }
}