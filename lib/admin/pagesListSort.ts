// Sort + cursor contract for the unified Pages admin list.
//
// 320 of the ~775 legacy categories have no `createdAt` and 168 have no
// `updatedAt`, so sorting on the raw field left those rows past a `$lt` cursor
// forever — the tail was unreachable and one missing date 500'd the whole list.
// Both queries therefore run as aggregations over a computed sort value that
// always resolves: updatedAt → createdAt → the ObjectId's own timestamp.

export const PAGES_SORT_KEYS = ['createdAt', 'updatedAt'] as const;
export type PagesSortKey = (typeof PAGES_SORT_KEYS)[number];

/** Name of the computed field the pipeline sorts and paginates on. */
export const SORT_VALUE_FIELD = '__sortValue';

export interface PagesCursor {
  c: string; // computed sort value, ISO
  id: string; // _id tiebreak
}

export function resolvePagesSortKey(raw: string | null): PagesSortKey {
  return raw === 'updated' ? 'updatedAt' : 'createdAt';
}

/** `$addFields` stage that gives every document a comparable sort value. */
export function buildSortValueStage(sortKey: PagesSortKey): Record<string, unknown> {
  const fallbackChain =
    sortKey === 'updatedAt'
      ? { $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', { $toDate: '$_id' }] }] }
      : { $ifNull: ['$createdAt', { $toDate: '$_id' }] };

  return { $addFields: { [SORT_VALUE_FIELD]: fallbackChain } };
}

/** Keyset predicate applied *after* the sort value exists. */
export function buildPagesCursorFilter(
  cursor: PagesCursor | null,
  toObjectId: (id: string) => unknown
): Record<string, unknown> {
  if (!cursor) return {};
  const value = new Date(cursor.c);
  return {
    $or: [
      { [SORT_VALUE_FIELD]: { $lt: value } },
      { [SORT_VALUE_FIELD]: value, _id: { $lt: toObjectId(cursor.id) } },
    ],
  };
}
