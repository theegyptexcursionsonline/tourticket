// app/api/interests/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import redis from '@/lib/redis';

type InterestItem = {
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  _id: any;
  featured?: boolean;
};

const CACHE_KEY = (limit?: number, featuredOnly?: boolean) =>
  `interests:limit=${limit ?? 'all'}:featured=${featuredOnly ? '1' : '0'}`;

// Utility: process array in batches to limit parallel DB calls
async function mapInBatches<T, R>(items: T[], batchSize: number, cb: (item: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map(cb));
    out.push(...results);
  }
  return out;
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Use query params if provided (client can request smaller lists)
    const url = new URL(request.url);
    const q = url.searchParams;
    const limitParam = q.get('limit');
    const featuredOnly = q.get('featured') === '1' || q.get('featured') === 'true';
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 0, 1000) : undefined;

    const cacheKey = CACHE_KEY(limit, featuredOnly);

    // Try Redis cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // If cached has limit applied, return as-is
        return NextResponse.json({ success: true, data: parsed });
      }
    } catch (err) {
      console.warn('Redis read failed, continuing to DB fetch', err);
      // continue to DB fetch
    }

    console.log('Cache miss for', cacheKey, '— fetching from DB');

    // 1) Fetch categories and attraction pages (lean)
    const [categories, attractionPages] = await Promise.all([
      Category.find({}).lean(),
      AttractionPage.find({ isPublished: true, pageType: 'attraction' }).lean()
    ]);

    console.log('Categories:', categories.length, 'AttractionPages:', attractionPages.length);

    // 2) Compute tour counts for categories using a single aggregation (fast)
    //    Group tours by category field and return counts
    const categoryCountsAgg = await Tour.aggregate([
      { $match: { isPublished: true, category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoryCountMap = new Map<string, number>();
    for (const row of categoryCountsAgg) {
      // row._id is ObjectId
      categoryCountMap.set(String(row._id), row.count);
    }

    const categoriesWithCounts: InterestItem[] = categories.map((cat: any) => ({
      type: 'category',
      name: cat.name,
      slug: cat.slug,
      products: categoryCountMap.get(String(cat._id)) ?? 0,
      _id: cat._id
    }));

    // 3) For attractions: avoid firing hundreds of parallel countDocuments.
    //    We'll process attractionPages in batches and build a lightweight search for each.
    //    NOTE: if attraction matching is expensive, consider precomputing mapping or adding a materialized collection.
    const BATCH_SIZE = 10;

    const attractionsWithCounts = await mapInBatches(attractionPages, BATCH_SIZE, async (page: any) => {
      try {
        // Build OR queries: title regex + tag matches (case-insensitive)
        const searchQueries: any[] = [];

        if (page.title) {
          // escape special regex characters in title to avoid catastrophic backtracking
          const safeTitle = page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          searchQueries.push({ title: { $regex: safeTitle, $options: 'i' } });
        }

        if (page.keywords && Array.isArray(page.keywords) && page.keywords.length > 0) {
          const validKeywords = page.keywords.filter((k: string) => k && k.trim().length > 0);
          if (validKeywords.length > 0) {
            // search in tags array
            searchQueries.push({ tags: { $in: validKeywords.map((k: string) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) } });
            // also search title for each keyword
            for (const kw of validKeywords) {
              const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              searchQueries.push({ title: { $regex: safeKw, $options: 'i' } });
            }
          }
        }

        let tourCount = 0;
        if (searchQueries.length > 0) {
          // count matching Tours (only published)
          tourCount = await Tour.countDocuments({
            isPublished: true,
            $or: searchQueries
          });
        }

        return {
          type: 'attraction',
          name: page.title,
          slug: page.slug,
          products: tourCount,
          _id: page._id,
          featured: !!page.featured
        } as InterestItem;
      } catch (err) {
        console.error(`Error counting tours for attraction ${page.title}`, err);
        return {
          type: 'attraction',
          name: page.title,
          slug: page.slug,
          products: 0,
          _id: page._id,
          featured: !!page.featured
        } as InterestItem;
      }
    });

    // 4) Combine and sort
    let allInterests: InterestItem[] = [...categoriesWithCounts, ...attractionsWithCounts];

    // Optionally filter featuredOnly on server-side to reduce payload
    if (featuredOnly) {
      allInterests = allInterests.filter(item => !!item.featured);
    }

    // Sort: featured first, then products desc, then name asc
    allInterests.sort((a, b) => {
      if ((a.featured ? 1 : 0) !== (b.featured ? 1 : 0)) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      if (b.products !== a.products) return b.products - a.products;
      return a.name.localeCompare(b.name);
    });

    // Apply limit if provided (server-side limiting reduces payload)
    const finalList = typeof limit === 'number' && limit > 0 ? allInterests.slice(0, limit) : allInterests;

    // 5) Cache the payload in Redis with TTL (adjust TTL as needed: 60–300s)
    try {
      // choose TTL depending on whether it's featuredOnly (featured rarely changes)
      const TTL_SECONDS = featuredOnly ? 300 : 60;
      await redis.set(cacheKey, JSON.stringify(finalList), 'EX', TTL_SECONDS);
    } catch (err) {
      console.warn('Failed to set redis cache for interests', err);
    }

    console.log('Final interests length:', finalList.length);
    return NextResponse.json({ success: true, data: finalList });
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch interests.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
