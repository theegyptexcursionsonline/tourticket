import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const page = await AttractionPage.findById(params.id)
      .populate({
        path: 'categoryId',
        model: Category,
        select: 'name slug'
      })
      .lean();

    if (!page) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: page 
    });
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction page' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    const updatedPage = await AttractionPage.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!updatedPage) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedPage 
    });
  } catch (error: any) {
    console.error('Error updating attraction page:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update attraction page' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const deletedPage = await AttractionPage.findByIdAndDelete(params.id);

    if (!deletedPage) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Page deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting attraction page:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete attraction page' 
    }, { status: 500 });
  }
}