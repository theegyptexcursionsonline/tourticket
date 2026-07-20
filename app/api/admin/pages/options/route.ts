// Search options for the Pages form pickers: tours to embed, and other
// pages/categories to link. Returns light rows (id, title, slug, image).
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const LIMIT = 20;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') || 'tours';
    const q = (searchParams.get('q') || '').trim();
    const excludeId = searchParams.get('excludeId');
    const idsParam = (searchParams.get('ids') || '').trim();

    const search = q ? new RegExp(escapeRegex(q), 'i') : null;
    // Explicit id lookup lets the form label already-selected items on edit.
    const ids = idsParam ? idsParam.split(',').filter(Boolean).slice(0, 100) : null;

    if (kind === 'tours') {
      const filter: Record<string, unknown> = { ...DEFAULT_TENANT_FILTER };
      if (ids) filter._id = { $in: ids };
      else if (search) filter.$or = [{ title: search }, { slug: search }];
      const tours = await Tour.find(filter)
        .select('title slug image isPublished')
        .sort({ isFeatured: -1, rating: -1 })
        .limit(ids ? ids.length : LIMIT)
        .lean();
      return NextResponse.json({
        success: true,
        data: (tours as Array<Record<string, unknown>>).map((tour) => ({
          id: String(tour._id),
          title: String(tour.title || ''),
          slug: String(tour.slug || ''),
          image: tour.image ? String(tour.image) : undefined,
          isPublished: tour.isPublished === true,
        })),
      });
    }

    if (kind === 'pages') {
      const pageConditions: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER];
      const categoryConditions: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER];
      const pageFilter: Record<string, unknown> = { $and: pageConditions };
      const categoryFilter: Record<string, unknown> = { $and: categoryConditions };
      if (excludeId) pageFilter._id = { $ne: excludeId };
      if (ids) {
        pageConditions.push({ _id: excludeId ? { $in: ids, $ne: excludeId } : { $in: ids } });
        categoryConditions.push({ _id: { $in: ids } });
      } else if (search) {
        pageConditions.push({ $or: [{ title: search }, { slug: search }] });
        categoryConditions.push({ $or: [{ name: search }, { slug: search }] });
      }

      const [pages, categories] = await Promise.all([
        AttractionPage.find(pageFilter)
          .select('title slug heroImage pageType isPublished')
          .sort({ createdAt: -1 })
          .limit(ids ? ids.length : LIMIT)
          .lean(),
        Category.find(categoryFilter)
          .select('name slug heroImage isPublished')
          .sort({ createdAt: -1 })
          .limit(ids ? ids.length : LIMIT)
          .lean(),
      ]);

      return NextResponse.json({
        success: true,
        data: [
          ...(pages as Array<Record<string, unknown>>).map((page) => ({
            id: String(page._id),
            title: String(page.title || ''),
            slug: String(page.slug || ''),
            image: page.heroImage ? String(page.heroImage) : undefined,
            kind: page.pageType === 'category' ? 'category-landing' : 'attraction',
            isPublished: page.isPublished === true,
          })),
          ...(categories as Array<Record<string, unknown>>).map((category) => ({
            id: String(category._id),
            title: String(category.name || ''),
            slug: String(category.slug || ''),
            image: category.heroImage ? String(category.heroImage) : undefined,
            kind: 'category',
            isPublished: category.isPublished !== false,
          })),
        ],
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown kind' }, { status: 400 });
  } catch (error) {
    console.error('Pages options error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load options' }, { status: 500 });
  }
}
