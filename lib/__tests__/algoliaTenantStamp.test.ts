/**
 * Search-index tenant isolation.
 *
 * The DB-level DEFAULT_TENANT_FILTER cannot protect Algolia — it is a separate
 * index. Search UIs read a hit with no tenant marker as default-site content
 * (see searchHitBelongsToTenant), so an unstamped record published for another
 * tenant would surface on the default storefront's search. These tests pin the
 * stamp that keeps that from happening.
 */

jest.mock('algoliasearch', () => ({ algoliasearch: jest.fn() }));

import {
  ALGOLIA_TENANT_FILTER_ATTRIBUTES,
  ALGOLIA_TENANT_RETRIEVE_ATTRIBUTES,
  formatBlogForAlgolia,
  formatCategoryForAlgolia,
  formatDestinationForAlgolia,
  formatTourForAlgolia,
} from '../algolia';
import { searchHitBelongsToTenant } from '../tenantSearchHitFilter';

describe('Algolia records carry their owning tenant', () => {
  it('configures both ownership fields for filtering and retrieval', () => {
    expect(ALGOLIA_TENANT_FILTER_ATTRIBUTES).toEqual([
      'filterOnly(tenantId)',
      'filterOnly(tenantIds)',
    ]);
    expect(ALGOLIA_TENANT_RETRIEVE_ATTRIBUTES).toEqual(['tenantId', 'tenantIds']);
  });

  it('stamps tours with their owning tenant', () => {
    expect(formatTourForAlgolia({ _id: 't1', tenantId: 'sharm-ausfluege' })).toEqual(
      expect.objectContaining({ tenantId: 'sharm-ausfluege' })
    );
  });

  it('stamps a default-site blog as the default tenant', () => {
    const record = formatBlogForAlgolia({ _id: 'b1', title: 'Hurghada guide', slug: 'hurghada' });

    expect(record.tenantId).toBe('default');
    expect(searchHitBelongsToTenant(record, 'default')).toBe(true);
  });

  it('stamps a foreign-tenant blog so it cannot surface on the default site', () => {
    const record = formatBlogForAlgolia({
      _id: 'b2',
      tenantId: 'makadi-bay',
      title: 'Makadi guide',
      slug: 'makadi',
    });

    expect(record.tenantId).toBe('makadi-bay');
    expect(searchHitBelongsToTenant(record, 'default')).toBe(false);
  });

  it('stamps destinations the same way', () => {
    const mine = formatDestinationForAlgolia({ _id: 'd1', name: 'Luxor' });
    const theirs = formatDestinationForAlgolia({ _id: 'd2', tenantId: 'el-gouna', name: 'Luxor' });

    expect(searchHitBelongsToTenant(mine, 'default')).toBe(true);
    expect(searchHitBelongsToTenant(theirs, 'default')).toBe(false);
  });

  it('preserves canonical navigation metadata for destination and category search hits', () => {
    const destination = formatDestinationForAlgolia({
      _id: 'd1',
      name: 'Luxor',
      slug: 'luxor',
      urlType: 'direct',
      parentPage: { slug: 'egypt' },
    });
    const category = formatCategoryForAlgolia({
      _id: 'c1',
      name: 'Desert Safari',
      slug: 'desert-safari',
      urlType: 'direct',
      parentPage: { slug: 'egypt' },
    });

    expect(destination).toEqual(expect.objectContaining({
      urlType: 'direct',
      parentPage: { slug: 'egypt' },
      archivedAt: null,
    }));
    expect(category).toEqual(expect.objectContaining({
      tenantId: 'default',
      urlType: 'direct',
      parentPage: { slug: 'egypt' },
      archivedAt: null,
    }));
  });

  it('keeps a foreign-tenant blog out of a default-site result set', () => {
    const hits = [
      formatBlogForAlgolia({ _id: 'b1', title: 'Ours', slug: 'ours' }),
      formatBlogForAlgolia({ _id: 'b2', tenantId: 'makadi-bay', title: 'Theirs', slug: 'theirs' }),
    ];

    const visible = hits.filter((hit) => searchHitBelongsToTenant(hit, 'default'));

    expect(visible.map((hit) => hit.title)).toEqual(['Ours']);
  });
});
