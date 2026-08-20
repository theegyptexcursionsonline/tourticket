/**
 * The trash filter every storefront read must compose in, the way
 * DEFAULT_TENANT_FILTER carries tenancy.
 *
 * Admins soft-delete content by setting `archivedAt` (Destination, Tour,
 * Category, AttractionPage all use that one field). Archiving also sets
 * `isPublished: false`, so an `isPublished: true` query is trash-safe by
 * side effect — but any query missing BOTH filters leaks trashed records to
 * customers. That is how deleted test destinations ("Test: Pyramids") kept
 * appearing in "Explore More Destinations" (client report 2026-08-21).
 *
 * Compose, never replace: `{ ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER }`
 * — or use `publicContentQuery()` when a query already carries `$or`/`$and`.
 */
export const NOT_ARCHIVED_FILTER = { archivedAt: null } as const;

export const PUBLIC_CONTENT_FILTER = {
  isPublished: true,
  archivedAt: null,
} as const;

/**
 * Adds published + not-archived to an existing query without clobbering a
 * `$or` the caller already built (Mongo allows only one top-level `$or`, so
 * a naive spread silently drops one of them).
 */
export function publicContentQuery<T extends Record<string, unknown>>(
  query: T,
  options: { requirePublished?: boolean } = {},
): T & Record<string, unknown> {
  const { requirePublished = true } = options;
  const filter: Record<string, unknown> = requirePublished
    ? { ...PUBLIC_CONTENT_FILTER }
    : { ...NOT_ARCHIVED_FILTER };
  return { ...query, ...filter };
}
