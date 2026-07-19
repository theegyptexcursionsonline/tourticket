import { revalidatePath } from 'next/cache';

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
    return true;
  } catch (error) {
    console.error('Storefront cache revalidation failed after durable write.', error);
    return false;
  }
}

export const revalidateTourStorefront = revalidateStorefrontContent;
