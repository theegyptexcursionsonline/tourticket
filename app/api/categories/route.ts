// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';
import { selectLocalizedTaxonomyEntries } from '@/lib/i18n/localizedCollections';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const searchParams = new URL(request.url).searchParams;
    const featuredOnly = searchParams.get('featured') === 'true';
    const locale = searchParams.get('locale') || 'en';

    const categories = await Category.find({
      ...(featuredOnly ? { featured: true } : {}),
      isPublished: true,
    })
      .sort({ order: 1, name: 1 })
      .lean();

    const categoryIds = categories.map((category: any) => category._id);
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

    const countMap = new Map(tourCounts.map((item: any) => [item._id?.toString(), item.count]));

    const categoriesWithCounts = categories.map((category: any) => ({
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
      requireTours: true,
    }).sort((a: any, b: any) => {
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

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json({
        success: false,
        error: 'Name and slug are required'
      }, { status: 400 });
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({ slug: body.slug });
    if (existingCategory) {
      return NextResponse.json({
        success: false,
        error: 'Slug already exists'
      }, { status: 400 });
    }

    const category = new Category(body);
    await category.save();

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create category'
    }, { status: 500 });
  }
}
