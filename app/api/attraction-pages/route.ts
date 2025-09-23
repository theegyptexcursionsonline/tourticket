import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();
    
    const pages = await AttractionPage.find({ isPublished: true })
      .populate({
        path: 'categoryId',
        model: Category,
        select: 'name slug'
      })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      data: pages 
    });
  } catch (error) {
    console.error('Error fetching published attraction pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction pages' 
    }, { status: 500 });
  }
}