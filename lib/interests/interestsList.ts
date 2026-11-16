// Public interests list (categories + attraction pages with their tour counts),
// shared by /api/interests.
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import AttractionPage from '@/lib/models/AttractionPage';
import { escapeRegex } from '@/lib/utils/escapeRegex';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { DEFAULT_TENANT_ID } from '@/lib/tenant/tenantScope';
import { unstable_cache } from 'next/cache';
import { CATEGORY_PAGES_TAG } from '@/lib/storefront/revalidateTourStorefront';

// The list counts tours per category and per attraction page (one regex count
// per page), which took ~11 s on every call; attraction pages call it twice
// and showed loading bars that whole time. The result only feeds discovery
// cards (names, pictures, counts; no prices or availability), so it is kept
// for five minutes like the category pages, and a tour save clears it through
// the same tag.
export const INTERESTS_REVALIDATE_SECONDS = 300;
export const INTERESTS_CACHE_KEY = ['interests-api', DEFAULT_TENANT_ID];

const CATEGORY_FIELDS = 'name slug heroImage featured urlType parentPage';
const ATTRACTION_FIELDS = 'title slug keywords heroImage featured urlType parentPage';

export async function loadInterests() {
    await dbConnect();

    const categories = await Category.find({ isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
      .select(CATEGORY_FIELDS)
      .lean();

    const attractionPages = await AttractionPage.find({
      isPublished: true,
      pageType: 'attraction',
      archivedAt: null,
      ...DEFAULT_TENANT_FILTER,
    })
      .select(ATTRACTION_FIELDS)
      .lean();

    const categoryCounts = await Tour.aggregate<{ _id: unknown; tourCount: number }>([
      { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
      { $unwind: '$category' },
      { $group: { _id: '$category', tourCount: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(categoryCounts.map((row) => [String(row._id), row.tourCount]));
    const categoriesWithCounts = categories.map((category) => ({
      type: 'category' as const,
      name: category.name,
      slug: category.slug,
      products: countByCategory.get(String(category._id)) || 0,
      _id: category._id,
      image: category.heroImage,
      featured: category.featured,
      urlType: category.urlType,
      parentPage: category.parentPage,
    }));

    // For each attraction page, count matching tours with simplified logic
    const attractionsWithCounts = await Promise.all(
      attractionPages.map(async (page) => {
        try {
          let tourCount = 0;

          // Build a simpler search query
          const searchQueries = [];

          // Search by title (most important)
          if (page.title) {
            searchQueries.push({
              title: { $regex: escapeRegex(page.title), $options: 'i' }
            });
          }

          // Search by keywords if they exist. Keywords are editor content, so
          // they must be escaped before becoming patterns — an unescaped one
          // emptied the homepage on 2026-08-07.
          if (page.keywords && Array.isArray(page.keywords) && page.keywords.length > 0) {
            const validKeywords = page.keywords.filter(k => k && k.trim().length > 0);

            if (validKeywords.length > 0) {
              searchQueries.push({
                tags: {
                  $in: validKeywords.map(k => new RegExp(escapeRegex(k), 'i'))
                }
              });

              validKeywords.forEach(keyword => {
                searchQueries.push({
                  title: { $regex: escapeRegex(keyword), $options: 'i' }
                });
              });
            }
          }

          // Only search if we have valid queries
          if (searchQueries.length > 0) {
            tourCount = await Tour.countDocuments({
              isPublished: true,
              archivedAt: null,
              ...DEFAULT_TENANT_FILTER,
              $or: searchQueries
            });
          }

          return {
            type: 'attraction' as const,
            name: page.title,
            slug: page.slug,
            products: tourCount,
            _id: page._id,
            featured: page.featured,
            image: page.heroImage,
            urlType: page.urlType,
            parentPage: page.parentPage,
          };
        } catch (error) {
          console.error(`Error counting tours for attraction ${page.title}:`, error);
          return {
            type: 'attraction' as const,
            name: page.title,
            slug: page.slug,
            products: 0,
            _id: page._id,
            featured: page.featured,
            image: page.heroImage
          };
        }
      })
    );

    // Combine categories and attractions
    const allInterests = [...categoriesWithCounts, ...attractionsWithCounts]
      .filter((interest) => interest.products > 0);

    // Sort by featured first, then by product count, then by name
    allInterests.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (b.products !== a.products) {
        return b.products - a.products;
      }
      return a.name.localeCompare(b.name);
    });

    return allInterests;
}

export const getCachedInterests = unstable_cache(loadInterests, INTERESTS_CACHE_KEY, {
  revalidate: INTERESTS_REVALIDATE_SECONDS,
  tags: [CATEGORY_PAGES_TAG],
});

