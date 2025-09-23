import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid page ID' 
      }, { status: 400 });
    }
    
    const page = await AttractionPage.findById(id)
      .populate({
        path: 'categoryId',
        model: Category,
        select: 'name slug'
      });
    
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
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid page ID' 
      }, { status: 400 });
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
    
    const page = await AttractionPage.findByIdAndUpdate(
      id, 
      data, 
      { 
        new: true, 
        runValidators: true 
      }
    ).populate({
      path: 'categoryId',
      model: Category,
      select: 'name slug'
    });
    
    if (!page) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: page,
      message: 'Attraction page updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating attraction page:', error);
    
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
      error: 'Failed to update attraction page' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid page ID' 
      }, { status: 400 });
    }
    
    const page = await AttractionPage.findByIdAndDelete(id);
    
    if (!page) {
      return NextResponse.json({ 
        success: false, 
        error: 'Page not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Attraction page deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting attraction page:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete attraction page' 
    }, { status: 500 });
  }
}