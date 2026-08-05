// app/api/categories/route.ts
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { contentPageAuditDetail } from '@/lib/admin/contentPageAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTaxonomyEntries } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import mongoose from 'mongoose';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = new URL(request.url).searchParams;
    const featuredOnly = searchParams.get('featured') === 'true';
    const locale = searchParams.get('locale') || 'en';
    // Storefront navigation hides categories with no tours yet. Admin pickers
    // must see them, otherwise a brand-new category can never be assigned its
    // first tour — it only becomes selectable once it already has one.
    const includeEmpty = searchParams.get('includeEmpty') === 'true';

    // Scope to this site's own categories. Without it the picker also lists the
    // German network's categories (e.g. "Abendtouren") in the English admin.
    const categories = await Category.find({
      $and: [
        DEFAULT_TENANT_FILTER,
        {
          ...(featuredOnly ? { featured: true } : {}),
          isPublished: true,
        },
      ],
    })
      .sort({ order: 1, name: 1 })
      .lean();

    const categoryIds = categories.map((category) => category._id);
    const tourCounts = await Tour.aggregate([
      {
        $match: {
          isPublished: true,
          ...DEFAULT_TENANT_FILTER,
          category: { $in: categoryIds },
        },
      },
      { $unwind: '$category' },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).catch(() => []);

    const countMap = new Map(tourCounts.map((item) => [item._id?.toString(), item.count]));

    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      tourCount: countMap.get(category._id?.toString()) || 0,
    }));

    const localizedCategories = selectLocalizedTaxonomyEntries(
      JSON.parse(JSON.stringify(categoriesWithCounts)),
      locale,
      ['name', 'description', 'longDescription', 'highlights', 'features', 'metaTitle', 'metaDescription']
    ).map((category: Record<string, unknown>) =>
      localizeEntityFields(category, locale, [
        'name',
        'description',
        'longDescription',
        'highlights',
        'features',
        'metaTitle',
        'metaDescription',
      ])
    );

    const visibleCategories = filterVisibleTaxonomyEntries(localizedCategories, {
      requireTours: !includeEmpty,
    }).sort((a, b) => {
      const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return NextResponse.json({ 
      success: true, 
      data: visibleCategories 
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch categories' 
    }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageContent'],
    });
    if (adminAuth instanceof NextResponse) {
      return adminAuth;
    }

    await dbConnect();
    
    const body = await request.json();
    Object.assign(body, sanitizeContentNavigation(body));
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({
        success: false,
        error: 'Name and slug are required'
      }, { status: 400 });
    }

    body.parentPage = await validateParentPageSelection({
      parentPage: body.parentPage,
      currentSlug: body.slug,
      tenantFilter: DEFAULT_TENANT_FILTER,
    });

    // The city URL shape needs a real owning destination to build /{city}/{slug}.
    if (body.urlType === 'city' && !mongoose.Types.ObjectId.isValid(body.cityDestination)) {
      return NextResponse.json({
        success: false,
        error: 'The City URL type requires an owning city (cityDestination).'
      }, { status: 400 });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({
      $and: [DEFAULT_TENANT_FILTER, { slug: body.slug }],
    });
    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Slug already exists'
      }, { status: 400 });
    }

    // The main portal owns only the default tenant. Never accept a caller-
    // supplied tenant id on this route.
    const category = new Category({ ...body, tenantId: 'default' });
    await category.save();
    revalidateStorefrontContent();
    registerAdminAuditDetail(contentPageAuditDetail({
      kind: 'category page',
      operation: 'create',
      after: category,
    }));

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);

    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoError?.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {}).join(', ') || 'slug';
      return NextResponse.json({
        success: false,
        error: `A page with this URL already exists (${field}). Choose a different value.`,
      }, { status: 409 });
    }
    
    if (error instanceof Error && (error as Error).name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: (error as Error).message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create category'
    }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
