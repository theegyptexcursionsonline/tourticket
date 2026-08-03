import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const { id } = await params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const page = await AttractionPage.findOne({ $and: [DEFAULT_TENANT_FILTER, { _id: id }] })
      .populate({
        path: 'categoryId',
        model: Category,
        match: DEFAULT_TENANT_FILTER,
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
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const { id } = await params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const body = await request.json();
    delete body.tenantId;

    // The city URL shape needs a real owning destination to build /{city}/{slug}.
    if (body.urlType === 'city' && !mongoose.Types.ObjectId.isValid(body.cityDestination)) {
      return NextResponse.json({
        success: false,
        error: 'The City URL type requires an owning city (cityDestination).'
      }, { status: 400 });
    }
    
    // ADD DEBUGGING
    console.log('🔍 Raw request body:', JSON.stringify(body, null, 2));
    console.log('📸 Images field received:', body.images);
    console.log('📸 Images type:', typeof body.images, Array.isArray(body.images));
    
    // Check if slug is being changed and if it conflicts
    if (body.slug) {
      const existingPage = await AttractionPage.findOne({ 
        $and: [
          DEFAULT_TENANT_FILTER,
          { slug: body.slug, _id: { $ne: id } },
        ],
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
      const category = await Category.findOne({
        $and: [DEFAULT_TENANT_FILTER, { _id: body.categoryId }],
      });
      if (!category) {
        return NextResponse.json({
          success: false,
          error: 'Category not found'
        }, { status: 400 });
      }
    }

    // PROPERLY HANDLE ARRAYS - This is the fix
    const linkedContent = await validateAndNormalizePageLinks(body, id);
    const updateData = {
      ...body,
      ...linkedContent,
      // Ensure arrays are properly handled — but only for keys the request sent,
      // so a partial update (e.g. archiving from the list row) can't blank them
      ...('images' in body ? { images: Array.isArray(body.images) ? body.images : (body.images ? [body.images] : []) } : {}),
      ...('highlights' in body ? { highlights: Array.isArray(body.highlights) ? body.highlights : (body.highlights ? [body.highlights] : []) } : {}),
      ...('features' in body ? { features: Array.isArray(body.features) ? body.features : (body.features ? [body.features] : []) } : {}),
      ...('keywords' in body ? { keywords: Array.isArray(body.keywords) ? body.keywords : (body.keywords ? [body.keywords] : []) } : {}),
    };

    console.log('💾 Final update data:', JSON.stringify(updateData, null, 2));

    const page = await AttractionPage.findOneAndUpdate(
      { $and: [DEFAULT_TENANT_FILTER, { _id: id }] },
      updateData, // Use processed data instead of raw body
      { new: true, runValidators: true }
    )
    .populate({
      path: 'categoryId',
      model: Category,
      match: DEFAULT_TENANT_FILTER,
      select: 'name slug'
    });

    if (!page) {
      return NextResponse.json({
        success: false,
        error: 'Page not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    console.log('✅ Page updated successfully');
    console.log('✅ Final saved images:', page.images);

    return NextResponse.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('❌ Error updating attraction page:', error);
    if (error instanceof PageLinkValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    // A slug collision reported by the database rather than the pre-check means
    // a uniqueness rule wider than the tenant is in play. Name it instead of
    // returning an unexplained failure.
    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoError?.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {}).join(', ') || 'slug';
      return NextResponse.json({
        success: false,
        error: `A page with this URL slug already exists (${field}). Choose a different slug.`,
      }, { status: 409 });
    }

    // Handle validation errors
    if (error instanceof Error && (error as Error).name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: (error as Error).message
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
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();

    const { id } = await params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid page ID'
      }, { status: 400 });
    }

    const page = await AttractionPage.findOneAndDelete({
      $and: [DEFAULT_TENANT_FILTER, { _id: id }],
    });

    if (!page) {
      return NextResponse.json({
        success: false,
        error: 'Page not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();

    console.log('Attraction page deleted successfully:', id);

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
