// Shared content resolution for attraction/landing pages ("Pages" in the
// admin). Used by the public page route and the public API so both agree on
// which tours and linked pages a page shows.

import { Types } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import AttractionPage from '@/lib/models/AttractionPage';
import Tour from '@/lib/models/Tour';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { contentPath } from '@/lib/content/contentUrl';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

export const ATTRACTION_PAGE_LOCALIZED_FIELDS = [
  'title',
  'description',
  'longDescription',
  'gridTitle',
  'gridSubtitle',
  'highlights',
  'features',
  'metaTitle',
  'metaDescription',
];

type LeanRecord = Record<string, unknown>;

const TOUR_CARD_POPULATE = [
  { path: 'destination', model: Destination, select: 'name slug country image description' },
  { path: 'category', model: Category, select: 'name slug' },
];

const TOUR_SORT = { isFeatured: -1 as const, rating: -1 as const, bookings: -1 as const };

interface PageLike {
  _id: unknown;
  pageType?: string;
  categoryId?: unknown;
  title?: string;
  keywords?: string[];
  highlights?: string[];
  linkedTourIds?: unknown[];
}

/**
 * Tours a page displays, in priority order:
 * 1. Admin-curated tours (linkedTourIds) — exact list, admin order.
 * 2. Tours referencing the page (attractions/interests) or its linked category.
 * 3. Keyword/title fallback, then featured tours, so the page never renders empty.
 */
export async function resolveAttractionPageTours(page: PageLike) {
  await dbConnect();

  const curatedIds = (page.linkedTourIds || []).filter((id) => Types.ObjectId.isValid(String(id)));
  if (curatedIds.length > 0) {
    const curated = await Tour.find({ _id: { $in: curatedIds }, isPublished: true })
      .populate(TOUR_CARD_POPULATE)
      .lean();
    const order = new Map(curatedIds.map((id, index) => [String(id), index]));
    curated.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    return { tours: curated as LeanRecord[], totalTours: curated.length };
  }

  if (page.pageType === 'category' && page.categoryId) {
    const categoryId =
      typeof page.categoryId === 'object' && page.categoryId !== null && '_id' in (page.categoryId as LeanRecord)
        ? (page.categoryId as LeanRecord)._id
        : page.categoryId;
    const filter = {
      $and: [
        { isPublished: true },
        { $or: [{ interests: page._id }, { category: categoryId }] },
      ],
    };
    const [tours, totalTours] = await Promise.all([
      Tour.find(filter).populate(TOUR_CARD_POPULATE).sort(TOUR_SORT).limit(60).lean(),
      Tour.countDocuments(filter),
    ]);
    return { tours: tours as LeanRecord[], totalTours };
  }

  // Attraction pages: tours that reference this page directly.
  const direct = await Tour.find({ attractions: page._id, isPublished: true })
    .populate(TOUR_CARD_POPULATE)
    .sort(TOUR_SORT)
    .limit(60)
    .lean();
  if (direct.length > 0) {
    const totalTours = await Tour.countDocuments({ attractions: page._id, isPublished: true });
    return { tours: direct as LeanRecord[], totalTours };
  }

  // Keyword fallback.
  const searchQueries: LeanRecord[] = [];
  if (page.title) {
    const titlePattern = new RegExp(escapeRegex(page.title), 'i');
    searchQueries.push({ title: { $regex: titlePattern } }, { description: { $regex: titlePattern } });
  }
  if (page.keywords?.length) {
    searchQueries.push({ tags: { $in: page.keywords } });
    for (const keyword of page.keywords) {
      const pattern = new RegExp(escapeRegex(keyword), 'i');
      searchQueries.push({ title: { $regex: pattern } });
    }
  }
  if (searchQueries.length > 0) {
    const matched = await Tour.find({ $and: [{ isPublished: true }, { $or: searchQueries }] })
      .populate(TOUR_CARD_POPULATE)
      .sort(TOUR_SORT)
      .limit(50)
      .lean();
    if (matched.length > 0) {
      return { tours: matched as LeanRecord[], totalTours: matched.length };
    }
  }

  // Featured fallback so the page never renders empty.
  const featured = await Tour.find({ isPublished: true, isFeatured: true })
    .populate(TOUR_CARD_POPULATE)
    .sort({ rating: -1, bookings: -1 })
    .limit(20)
    .lean();
  return { tours: featured as LeanRecord[], totalTours: featured.length };
}

export interface LinkedPageCard {
  id: string;
  title: string;
  description?: string;
  image?: string;
  href: string;
  kind: 'page' | 'category';
}

/**
 * Cards for other pages an admin embedded in this page — attraction pages
 * (linkedPageIds) and categories (linkedCategoryIds). Unpublished targets are
 * skipped so a draft never leaks onto the storefront.
 */
export async function resolveLinkedPageCards(page: {
  linkedPageIds?: unknown[];
  linkedCategoryIds?: unknown[];
}, locale: string): Promise<LinkedPageCard[]> {
  await dbConnect();

  const pageIds = (page.linkedPageIds || []).filter((id) => Types.ObjectId.isValid(String(id)));
  const categoryIds = (page.linkedCategoryIds || []).filter((id) => Types.ObjectId.isValid(String(id)));
  if (pageIds.length === 0 && categoryIds.length === 0) return [];

  const [pages, categories] = await Promise.all([
    pageIds.length
      ? AttractionPage.find({ _id: { $in: pageIds }, isPublished: true })
          .select('title slug description heroImage pageType urlType translations')
          .lean()
      : [],
    categoryIds.length
      ? Category.find({ _id: { $in: categoryIds }, isPublished: { $ne: false } })
          .select('name slug description heroImage urlType translations')
          .lean()
      : [],
  ]);

  const cards: LinkedPageCard[] = [];

  for (const doc of pages as LeanRecord[]) {
    const localized = localizeEntityFields(doc, locale, ['title', 'description']);
    cards.push({
      id: String(doc._id),
      title: String(localized.title || ''),
      description: localized.description ? String(localized.description) : undefined,
      image: doc.heroImage ? String(doc.heroImage) : undefined,
      href:
        doc.pageType === 'category'
          ? `/category/${String(doc.slug)}`
          : contentPath('page', String(doc.slug), doc.urlType as string | undefined),
      kind: 'page',
    });
  }

  for (const doc of categories as LeanRecord[]) {
    const localized = localizeEntityFields(doc, locale, ['name', 'description']);
    cards.push({
      id: String(doc._id),
      title: String(localized.name || ''),
      description: localized.description ? String(localized.description) : undefined,
      image: doc.heroImage ? String(doc.heroImage) : undefined,
      href: contentPath('category', String(doc.slug), doc.urlType as string | undefined),
      kind: 'category',
    });
  }

  // Preserve the admin's selection order: pages first as picked, then categories.
  const orderMap = new Map<string, number>();
  [...pageIds, ...categoryIds].forEach((id, index) => orderMap.set(String(id), index));
  cards.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return cards;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
