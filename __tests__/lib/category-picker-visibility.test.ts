/**
 * Regression: the tour form's category picker fetched /api/categories, which
 * hides categories that have no published tours yet (requireTours). A brand-new
 * category therefore never appeared in the picker, so it could never be given
 * its first tour — a chicken-and-egg bug the client reported (sheet row 87,
 * "Newly created Categories do not appear under the Category selection for
 * Tours. Only the old pre-existing Categories currently appear.").
 *
 * The picker now passes ?includeEmpty=true. These lock the predicate both ways.
 */

import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const withTours = { name: 'Camel Tours', slug: 'camel-tours', isPublished: true, tourCount: 4 };
const brandNew = { name: 'Luxor Day Trips', slug: 'luxor-day-trips', isPublished: true, tourCount: 0 };
const unpublished = { name: 'Draft', slug: 'draft', isPublished: false, tourCount: 3 };

describe('category picker visibility', () => {
  it('storefront navigation still hides categories with no tours', () => {
    const visible = filterVisibleTaxonomyEntries([withTours, brandNew], { requireTours: true });
    expect(visible.map((c) => c.slug)).toEqual(['camel-tours']);
  });

  it('admin picker (includeEmpty) shows a brand-new empty category', () => {
    const visible = filterVisibleTaxonomyEntries([withTours, brandNew], { requireTours: false });
    expect(visible.map((c) => c.slug).sort()).toEqual(['camel-tours', 'luxor-day-trips']);
  });

  it('never exposes an unpublished category, even to the admin picker', () => {
    const visible = filterVisibleTaxonomyEntries([withTours, unpublished], { requireTours: false });
    expect(visible.map((c) => c.slug)).toEqual(['camel-tours']);
  });

  it.each([
    ['Tour', 'components/TourForm.tsx'],
    ['Category 2', 'components/admin/AttractionPageForm.tsx'],
  ])('%s picker requests the complete published category set', (_label, relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
    expect(source).toContain("fetch('/api/categories?includeEmpty=true')");
  });
});
