import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import mongoose from 'mongoose';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    console.log('Starting to fetch attraction pages...');
    await dbConnect();
    console.log('Database connected successfully');
    
    // First, get all pages without population
    const pages = await AttractionPage.find(DEFAULT_TENANT_FILTER)
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    console.log(`Found ${pages.length} attraction pages`);

    // Then populate categoryId manually for better error handling
    const pagesWithCategories = await Promise.all(
      pages.map(async (page) => {
        let categoryId: unknown = page.categoryId;
        if (page.categoryId) {
          try {
            const category = await Category.findOne({
              $and: [DEFAULT_TENANT_FILTER, { _id: page.categoryId }],
            }).select('name slug').lean();
            categoryId = category;
          } catch (error) {
            console.error(`Error populating category for page ${page._id}:`, error);
            categoryId = null;
          }
        }

        return { ...page, categoryId };
      })
    );

    console.log('Categories populated successfully');

    // Add tour counts for each page
    const pagesWithCounts = await Promise.all(
      pagesWithCategories.map(async (page) => {
        let tourCount = 0;
        
        try {
          if (page.pageType === 'category' && page.categoryId) {
            const categoryId = typeof page.categoryId === 'object' && page.categoryId !== null && '_id' in page.categoryId
              ? page.categoryId._id
              : page.categoryId;
            tourCount = await Tour.countDocuments({
              category: categoryId,
              isPublished: true,
              ...DEFAULT_TENANT_FILTER,
            });
          } else if (page.pageType === 'attraction') {
            // Count tours that match this attraction
            const searchTerms = [
              page.title,
              ...(page.keywords || []),
              ...(page.highlights || [])
            ].filter(Boolean);

            if (searchTerms.length > 0) {
              const searchQueries = [];
              searchQueries.push({ title: { $regex: new RegExp(page.title, 'i') } });
              searchQueries.push({ description: { $regex: new RegExp(page.title, 'i') } });
              
              if (page.keywords && page.keywords.length > 0) {
                searchQueries.push({ tags: { $in: page.keywords } });
                searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(page.keywords.join('|'), 'i') } } });
              }
              
              if (page.highlights && page.highlights.length > 0) {
                searchQueries.push({ highlights: { $elemMatch: { $regex: new RegExp(page.highlights.join('|'), 'i') } } });
              }

              tourCount = await Tour.countDocuments({
                $and: [
                  { isPublished: true },
                  DEFAULT_TENANT_FILTER,
                  { $or: searchQueries },
                ],
              });
            }
          }
        } catch (error) {
          console.error(`Error counting tours for page ${page._id}:`, error);
          tourCount = 0;
        }
        
        return {
          ...page,
          tourCount
        };
      })
    );

    console.log('Tour counts added successfully');

    return NextResponse.json({ 
      success: true, 
      data: pagesWithCounts 
    });
  } catch (error) {
    console.error('Error fetching attraction pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    
    const body = await request.json();
    Object.assign(body, sanitizeContentNavigation(body));
    delete body.tenantId;

    // The city URL shape needs a real owning destination to build /{city}/{slug}.
    if (body.urlType === 'city' && !mongoose.Types.ObjectId.isValid(body.cityDestination)) {
      return NextResponse.json({
        success: false,
        error: 'The City URL type requires an owning city (cityDestination).'
      }, { status: 400 });
    }
    console.log('Creating attraction page with data:', body);
    
    // Validate required fields
    const requiredFields = ['title', 'slug', 'description', 'heroImage', 'gridTitle', 'pageType'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Check if slug already exists
    const existingPage = await AttractionPage.findOne({
      $and: [DEFAULT_TENANT_FILTER, { slug: body.slug }],
    });
    if (existingPage) {
      return NextResponse.json({
        success: false,
        error: 'Slug already exists'
      }, { status: 400 });
    }

    // Validate categoryId if pageType is category
    if (body.pageType === 'category') {
      if (!body.categoryId) {
        return NextResponse.json({
          success: false,
          error: 'Category ID is required for category pages'
        }, { status: 400 });
      }
      
      // Check if category exists
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

    const linkedContent = await validateAndNormalizePageLinks(body);
    const page = new AttractionPage({ ...body, ...linkedContent });
    await page.save();
    revalidateStorefrontContent();

    // Populate the category for response
    await page.populate({
      path: 'categoryId',
      select: 'name slug'
    });

    console.log('Attraction page created successfully:', page._id);

    return NextResponse.json({
      success: true,
      data: page
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating attraction page:', error);
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
      error: 'Failed to create attraction page',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
