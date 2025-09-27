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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

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
      error: 'Failed to fetch attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const body = await request.json();
    console.log('Updating attraction page:', params.id, 'with data:', body);
    
    // Check if slug is being changed and if it conflicts
    if (body.slug) {
      const existingPage = await AttractionPage.findOne({ 
        slug: body.slug,
        _id: { $ne: params.id }
      });
      
      if (existingPage) {
        return NextResponse.json({
          success: false,
          error: 'Slug already exists'
        }, { status: 400 });
      }
    }

    // Validate categoryId if pageType is category
    if (body.pageType === 'category' && body.categoryId) {
      const category = await Category.findById(body.categoryId);
      if (!category) {
        return NextResponse.json({
          success: false,
          error: 'Category not found'
        }, { status: 400 });
      }
    }

    const page = await AttractionPage.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    )
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

    console.log('Attraction page updated successfully:', page._id);

    return NextResponse.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Error updating attraction page:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const page = await AttractionPage.findByIdAndDelete(params.id);

    if (!page) {
      return NextResponse.json({
        success: false,
        error: 'Page not found'
      }, { status: 404 });
    }

    console.log('Attraction page deleted successfully:', params.id);

    return NextResponse.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attraction page:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}