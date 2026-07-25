/**
 * Client request (26 Jul): the Pages and Tours lists could only be sorted by
 * newest-created, so an editor could not find what they had just changed.
 *
 * The Pages list is cursor-paginated over two collections, and ~40% of the
 * legacy categories carry no createdAt (168 carry no updatedAt). Sorting on the
 * raw field therefore stranded those rows past the cursor — the tail was
 * unreachable, and one missing date 500'd the whole list. These lock the
 * computed sort value and the keyset predicate built on top of it.
 */

import {
  buildPagesCursorFilter,
  buildSortValueStage,
  resolvePagesSortKey,
  PAGES_SORT_KEYS,
  SORT_VALUE_FIELD,
} from '@/lib/admin/pagesListSort';

const toObjectId = (id: string) => ({ oid: id });
const cursor = { c: '2026-07-20T10:00:00.000Z', id: '66a000000000000000000001' };

describe('pages list sort key', () => {
  it('only accepts the two supported keys, defaulting to created', () => {
    expect(PAGES_SORT_KEYS).toEqual(['createdAt', 'updatedAt']);
    expect(resolvePagesSortKey('updated')).toBe('updatedAt');
    expect(resolvePagesSortKey('created')).toBe('createdAt');
    expect(resolvePagesSortKey(null)).toBe('createdAt');
    expect(resolvePagesSortKey('nonsense')).toBe('createdAt');
  });
});

describe('computed sort value', () => {
  it('falls back createdAt -> ObjectId timestamp under the default sort', () => {
    const stage = buildSortValueStage('createdAt') as { $addFields: Record<string, unknown> };
    expect(stage.$addFields[SORT_VALUE_FIELD]).toEqual({
      $ifNull: ['$createdAt', { $toDate: '$_id' }],
    });
  });

  it('falls back updatedAt -> createdAt -> ObjectId timestamp under last-modified', () => {
    const stage = buildSortValueStage('updatedAt') as { $addFields: Record<string, unknown> };
    expect(stage.$addFields[SORT_VALUE_FIELD]).toEqual({
      $ifNull: ['$updatedAt', { $ifNull: ['$createdAt', { $toDate: '$_id' }] }],
    });
  });
});

describe('pages list cursor', () => {
  it('walks the computed value, never the raw timestamp', () => {
    const filter = buildPagesCursorFilter(cursor, toObjectId) as { $or: Record<string, unknown>[] };
    expect(filter.$or[0]).toHaveProperty(SORT_VALUE_FIELD);
    expect(filter.$or[0]).not.toHaveProperty('createdAt');
    expect(filter.$or[0]).not.toHaveProperty('updatedAt');
  });

  it('breaks ties on _id so equal timestamps cannot loop', () => {
    const filter = buildPagesCursorFilter(cursor, toObjectId) as { $or: Record<string, unknown>[] };
    expect(filter.$or[1]).toHaveProperty('_id');
    expect(filter.$or[1][SORT_VALUE_FIELD]).toEqual(new Date(cursor.c));
  });

  it('is a no-op on the first page', () => {
    expect(buildPagesCursorFilter(null, toObjectId)).toEqual({});
  });
});
