import { revalidatePath, revalidateTag } from 'next/cache';

/** Data tag of the stored category (list) page data; see CategoryDetailContent. */
export const CATEGORY_PAGES_TAG = 'category-pages';

/**
 * Category pages keep their data for five minutes (owner decision 16 Nov 2026).
 * A save expires it immediately rather than stale-while-revalidate ('max'), so
 * the very next visitor sees the edit instead of one more stale page.
 */
export function revalidateCategoryPages() {
  revalidateTag(CATEGORY_PAGES_TAG, { expire: 0 });
}

const STOREFRONT_ROOTS: Array<[string, 'layout']> = [
  ['/', 'layout'],
  ['/[locale]', 'layout'],
];

/**
 * Purge storefront ISR entries after a durable content write.
 * Cache invalidation is best effort and must not turn a saved admin change
 * into an error response.
 */
export function revalidateStorefrontContent() {
  try {
    for (const [path, type] of STOREFRONT_ROOTS) {
      revalidatePath(path, type);
    }
    revalidateTag('destination-pages', 'max');
    revalidateCategoryPages();
    revalidateTag('tours-index', 'max');
    return true;
  } catch (error) {
    console.error('Storefront cache revalidation failed after durable write.', error);
    return false;
  }
}

export const revalidateTourStorefront = revalidateStorefrontContent;
