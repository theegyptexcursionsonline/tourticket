// Unified "Pages" admin list: attraction/landing pages (AttractionPage) and
// categories (Category) in one cursor-paginated feed, newest first. The two
// collections stay separate models; this endpoint only unifies management.
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { contentPath } from '@/lib/content/contentUrl';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const MAX_LIMIT = 50;

type PageKind = 'attraction' | 'category-landing' | 'category';

interface PagesCursor {
  c: string; // createdAt ISO
  id: string; // _id tiebreak
}

interface UnifiedRow {
  id: string;
  kind: PageKind;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  urlType: string;
  publicPath: string;
  editHref: string;
  isPublished: boolean;
  featured: boolean;
  createdAt: string;
}

function decodeCursor(raw: string | null): PagesCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as PagesCursor;
    if (!parsed?.c || !parsed?.id || Number.isNaN(Date.parse(parsed.c))) return null;
    if (!Types.ObjectId.isValid(parsed.id)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function encodeCursor(cursor: PagesCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cursorFilter(cursor: PagesCursor | null): Record<string, unknown> {
  if (!cursor) return {};
  const createdAt = new Date(cursor.c);
  return {
    $or: [
      { createdAt: { $lt: createdAt } },
      { createdAt, _id: { $lt: new Types.ObjectId(cursor.id) } },
    ],
  };
}

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (adminAuth instanceof NextResponse) return adminAuth;

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (q.length > 100) {
      return NextResponse.json({ success: false, error: 'Search is too long' }, { status: 400 });
    }
    const kind = (searchParams.get('kind') || 'all') as PageKind | 'all';
    const status = searchParams.get('status') || 'all';
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get('limit')) || 20));
    const cursor = decodeCursor(searchParams.get('cursor'));

    const search = q ? new RegExp(escapeRegex(q), 'i') : null;

    const wantAttractionPages = kind === 'all' || kind === 'attraction' || kind === 'category-landing';
    const wantCategories = kind === 'all' || kind === 'category';

    const attractionConditions: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER, cursorFilter(cursor)];
    const attractionFilter: Record<string, unknown> = { $and: attractionConditions };
    if (kind === 'attraction') attractionFilter.pageType = 'attraction';
    if (kind === 'category-landing') attractionFilter.pageType = 'category';
    if (status === 'published') attractionFilter.isPublished = true;
    if (status === 'draft') attractionFilter.isPublished = { $ne: true };
    // Push (never replace $and): the tenant scope and cursor must survive search.
    if (search) attractionConditions.push({ $or: [{ title: search }, { slug: search }] });

    const categoryConditions: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER, cursorFilter(cursor)];
    const categoryFilter: Record<string, unknown> = { $and: categoryConditions };
    if (status === 'published') categoryFilter.isPublished = { $ne: false };
    if (status === 'draft') categoryFilter.isPublished = false;
    if (search) categoryConditions.push({ $or: [{ name: search }, { slug: search }] });

    const fetchSize = limit + 1;

    const [pages, categories] = await Promise.all([
      wantAttractionPages
        ? AttractionPage.find(attractionFilter)
            .select('title slug description heroImage pageType urlType isPublished featured createdAt')
            .sort({ createdAt: -1, _id: -1 })
            .limit(fetchSize)
            .lean()
        : [],
      wantCategories
        ? Category.find(categoryFilter)
            .select('name slug description heroImage urlType isPublished featured createdAt')
            .sort({ createdAt: -1, _id: -1 })
            .limit(fetchSize)
            .lean()
        : [],
    ]);

    const rows: UnifiedRow[] = [];

    for (const page of pages as Array<Record<string, unknown>>) {
      const isLanding = page.pageType === 'category';
      rows.push({
        id: String(page._id),
        kind: isLanding ? 'category-landing' : 'attraction',
        title: String(page.title || ''),
        slug: String(page.slug || ''),
        description: page.description ? String(page.description) : undefined,
        image: page.heroImage ? String(page.heroImage) : undefined,
        urlType: String(page.urlType || 'default'),
        publicPath: isLanding
          ? `/category/${String(page.slug)}`
          : contentPath('page', String(page.slug), page.urlType as string | undefined),
        editHref: `/admin/attraction-pages/${String(page._id)}/edit`,
        isPublished: page.isPublished === true,
        featured: page.featured === true,
        createdAt: new Date(page.createdAt as string).toISOString(),
      });
    }

    for (const category of categories as Array<Record<string, unknown>>) {
      rows.push({
        id: String(category._id),
        kind: 'category',
        title: String(category.name || ''),
        slug: String(category.slug || ''),
        description: category.description ? String(category.description) : undefined,
        image: category.heroImage ? String(category.heroImage) : undefined,
        urlType: String(category.urlType || 'default'),
        publicPath: contentPath('category', String(category.slug), category.urlType as string | undefined),
        editHref: `/admin/categories/${String(category._id)}/edit`,
        isPublished: category.isPublished !== false,
        featured: category.featured === true,
        createdAt: new Date(category.createdAt as string).toISOString(),
      });
    }

    rows.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ c: last.createdAt, id: last.id }) : null;

    const [attractionCount, landingCount, categoryCount] = await Promise.all([
      AttractionPage.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { pageType: 'attraction' }] }),
      AttractionPage.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { pageType: 'category' }] }),
      Category.countDocuments(DEFAULT_TENANT_FILTER),
    ]);

    return NextResponse.json({
      success: true,
      data: pageRows,
      nextCursor,
      counts: {
        attraction: attractionCount,
        'category-landing': landingCount,
        category: categoryCount,
        total: attractionCount + landingCount + categoryCount,
      },
    });
  } catch (error) {
    console.error('Unified pages list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load pages' }, { status: 500 });
  }
}
