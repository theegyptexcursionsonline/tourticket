import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

export async function GET() {
  try {
    await dbConnect();
    
    console.log('Fetching published attraction pages...');
    
    const pages = await AttractionPage.find({ ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER })
      .sort({ featured: -1, createdAt: -1 })
      .lean();

    console.log(`Found ${pages.length} published pages`);

    // Populate categories manually for better error handling
    const pagesWithCategories = await Promise.all(
      pages.map(async (page) => {
        let categoryId: unknown = page.categoryId;
        if (page.categoryId) {
          try {
            const category = await Category.findOne({
              _id: page.categoryId,
              ...DEFAULT_TENANT_FILTER,
              ...PUBLIC_CONTENT_FILTER,
            })
              .select('name slug')
              .lean();
            categoryId = category;
          } catch (error) {
            console.error(`Error populating category for page ${page._id}:`, error);
            categoryId = null;
          }
        }

        return { ...page, categoryId };
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: pagesWithCategories 
    });
  } catch (error) {
    console.error('Error fetching published attraction pages:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch attraction pages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
