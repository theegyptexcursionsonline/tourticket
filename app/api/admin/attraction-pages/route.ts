import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();
    
    const pages = await AttractionPage.find({})
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

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    const page = await AttractionPage.create(data);

    return NextResponse.json({ 
      success: true, 
      data: page 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating attraction page:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create attraction page' 
    }, { status: 500 });
  }
}