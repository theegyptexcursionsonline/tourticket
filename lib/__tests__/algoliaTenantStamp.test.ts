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

import { formatBlogForAlgolia, formatDestinationForAlgolia } from '../algolia';
import { searchHitBelongsToTenant } from '../tenantSearchHitFilter';

describe('Algolia records carry their owning tenant', () => {
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

  it('keeps a foreign-tenant blog out of a default-site result set', () => {
    const hits = [
      formatBlogForAlgolia({ _id: 'b1', title: 'Ours', slug: 'ours' }),
      formatBlogForAlgolia({ _id: 'b2', tenantId: 'makadi-bay', title: 'Theirs', slug: 'theirs' }),
    ];

    const visible = hits.filter((hit) => searchHitBelongsToTenant(hit, 'default'));

    expect(visible.map((hit) => hit.title)).toEqual(['Ours']);
  });
});
