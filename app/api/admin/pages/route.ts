// Unified "Pages" admin list: attraction/landing pages (AttractionPage) and
// categories (Category) in one cursor-paginated feed, newest first. The two
// collections stay separate models; this endpoint only unifies management.
import { NextRequest, NextResponse } from 'next/server';
import { Types, type PipelineStage } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { contentPath, attractionPagePath } from '@/lib/content/contentUrl';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import {
  buildPagesCursorFilter,
  buildSortValueStage,
  resolvePagesSortKey,
  SORT_VALUE_FIELD,
  type PagesCursor,
  type PagesSortKey,
} from '@/lib/admin/pagesListSort';

const MAX_LIMIT = 50;

type PageKind = 'attraction' | 'category-landing' | 'category';

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
  updatedAt: string;
  sortValue: string;
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

// Legacy category/page docs predate timestamps, and `new Date(undefined)`
// throws on .toISOString() — which took the whole list down with a 500 rather
// than dropping one date cell. Fall back to the ObjectId's embedded timestamp.
function isoStamp(value: unknown, fallbackId: unknown): string {
  for (const candidate of [value]) {
    if (candidate) {
      const parsed = new Date(candidate as string);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }
  try {
    return new Types.ObjectId(String(fallbackId)).getTimestamp().toISOString();
  } catch {
    return new Date(0).toISOString();
  }
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
    const sortKey: PagesSortKey = resolvePagesSortKey(searchParams.get('sort'));
    const cursor = decodeCursor(searchParams.get('cursor'));

    const search = q ? new RegExp(escapeRegex(q), 'i') : null;

    const wantAttractionPages = kind === 'all' || kind === 'attraction' || kind === 'category-landing';
    const wantCategories = kind === 'all' || kind === 'category';

    const cursorMatch = buildPagesCursorFilter(cursor, (id) => new Types.ObjectId(id));

    const attractionConditions: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER];
    const attractionFilter: Record<string, unknown> = { $and: attractionConditions };
    if (kind === 'attraction') attractionFilter.pageType = 'attraction';
    if (kind === 'category-landing') attractionFilter.pageType = 'category';
    if (status === 'published') attractionFilter.isPublished = true;
    if (status === 'draft') attractionFilter.isPublished = { $ne: true };
    // Archived rows are hidden everywhere except their own filter, which is
    // the point of archiving: they stop cluttering the working lists.
    if (status === 'archived') attractionFilter.archivedAt = { $ne: null };
    else attractionFilter.archivedAt = null;
    // Push (never replace $and): the tenant scope must survive search.
    if (search) attractionConditions.push({ $or: [{ title: search }, { slug: search }] });

    const categoryConditions: Record<string, unknown>[] = [DEFAULT_TENANT_FILTER];
    const categoryFilter: Record<string, unknown> = { $and: categoryConditions };
    if (status === 'published') categoryFilter.isPublished = { $ne: false };
    if (status === 'draft') categoryFilter.isPublished = false;
    if (status === 'archived') categoryFilter.archivedAt = { $ne: null };
    else categoryFilter.archivedAt = null;
    if (search) categoryConditions.push({ $or: [{ name: search }, { slug: search }] });

    const fetchSize = limit + 1;

    // The cursor is applied after $addFields so it compares against the
    // computed sort value, not the (sometimes absent) raw timestamp.
    const pipeline = (match: Record<string, unknown>, project: Record<string, 1>): PipelineStage[] => [
      { $match: match },
      buildSortValueStage(sortKey) as unknown as PipelineStage,
      ...(Object.keys(cursorMatch).length > 0 ? [{ $match: cursorMatch }] : []),
      { $sort: { [SORT_VALUE_FIELD]: -1, _id: -1 } },
      { $limit: fetchSize },
      { $project: { ...project, [SORT_VALUE_FIELD]: 1 } },
    ];

    const [pages, categories] = await Promise.all([
      wantAttractionPages
        ? AttractionPage.aggregate(
            pipeline(attractionFilter, {
              title: 1, slug: 1, description: 1, heroImage: 1, pageType: 1,
              urlType: 1, isPublished: 1, featured: 1, createdAt: 1, updatedAt: 1,
            })
          )
        : [],
      wantCategories
        ? Category.aggregate(
            pipeline(categoryFilter, {
              name: 1, slug: 1, description: 1, heroImage: 1,
              urlType: 1, isPublished: 1, featured: 1, createdAt: 1, updatedAt: 1,
            })
          )
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
        publicPath: attractionPagePath(String(page.slug), page.pageType as string, page.urlType as string | undefined),
        editHref: `/admin/attraction-pages/${String(page._id)}/edit`,
        isPublished: page.isPublished === true,
        featured: page.featured === true,
        createdAt: isoStamp(page.createdAt, page._id),
        updatedAt: isoStamp(page.updatedAt || page.createdAt, page._id),
        sortValue: isoStamp(page[SORT_VALUE_FIELD], page._id),
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
        createdAt: isoStamp(category.createdAt, category._id),
        updatedAt: isoStamp(category.updatedAt || category.createdAt, category._id),
        sortValue: isoStamp(category[SORT_VALUE_FIELD], category._id),
      });
    }

    // Merge the two model streams on the same computed value the DB sorted by.
    rows.sort((a, b) => {
      if (a.sortValue !== b.sortValue) return a.sortValue < b.sortValue ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });

    const pageRows = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ c: last.sortValue, id: last.id }) : null;

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
