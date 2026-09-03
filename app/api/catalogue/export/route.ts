// GET /api/catalogue/export — public, read-only, cursor-paginated catalogue feed.
//
// Purpose: let an assistant (FoxesConnect knowledge sync) hold the same published
// tour facts a customer reads on the site, without scraping HTML. Everything here
// is already public page content; drafts, archived tours and other tenants are
// excluded, and no operational, pricing-internal or personal fields are exposed.
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import {
  buildCatalogueDoc,
  catalogueCursorFilter,
  catalogueLimit,
  CATALOGUE_EXPORT_CONTRACT,
  CATALOGUE_TOUR_PROJECTION,
  type CatalogueTourInput,
} from '@/lib/catalogue/export';

export const dynamic = 'force-dynamic';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://egypt-excursionsonline.com').replace(/\/+$/, '');

export async function GET(request: Request) {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const limit = catalogueLimit(url.searchParams.get('limit'));
    const cursorFilter = catalogueCursorFilter(url.searchParams.get('cursor'));

    const tours = await Tour.find({
      isPublished: true,
      archivedAt: { $in: [null, undefined] },
      ...DEFAULT_TENANT_FILTER,
      ...cursorFilter,
    })
      .select(CATALOGUE_TOUR_PROJECTION)
      .populate('destination', 'name slug')
      .populate('category', 'name slug')
      .sort({ _id: 1 })
      .limit(limit)
      .lean();

    const docs = (tours as unknown as CatalogueTourInput[])
      .map((tour) => buildCatalogueDoc(tour, BASE))
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    const last = tours.length === limit ? tours[tours.length - 1] : null;
    const response = NextResponse.json({
      contract: CATALOGUE_EXPORT_CONTRACT,
      baseUrl: BASE,
      count: docs.length,
      nextCursor: last ? String((last as { _id: mongoose.Types.ObjectId })._id) : null,
      documents: docs,
    });
    // Short public cache: the assistant re-syncs on a schedule, and a stale
    // answer about a tour is worse than a slightly slower sync.
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    return response;
  } catch {
    // Never leak internals to a public caller; the sync treats a non-200 as a
    // failed run and keeps its last good snapshot.
    return NextResponse.json({ error: 'catalogue_export_failed' }, { status: 500 });
  }
}
