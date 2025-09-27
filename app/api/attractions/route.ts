import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';

export async function GET() {
  try {
    await dbConnect();
    
    const attractions = await AttractionPage.find({ 
      isPublished: true,
      pageType: 'attraction'
    })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      data: attractions 
    });
  } catch (error) {
    console.error('Error fetching attractions:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attractions' 
    }, { status: 500 });
  }
}