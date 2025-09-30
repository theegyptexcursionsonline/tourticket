// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const category = await Category.findById(params.id).lean();

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch category'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const body = await request.json();
    
    // Check if slug is being changed and if it conflicts
    if (body.slug) {
      const existingCategory = await Category.findOne({ 
        slug: body.slug,
        _id: { $ne: params.id }
      });
      
      if (existingCategory) {
        return NextResponse.json({
          success: false,
          error: 'Slug already exists'
        }, { status: 400 });
      }
    }

    const category = await Category.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update category'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const category = await Category.findByIdAndDelete(params.id);

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete category'
    }, { status: 500 });
  }
}