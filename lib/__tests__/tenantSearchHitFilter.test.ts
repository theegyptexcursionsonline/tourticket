import {
  filterTourSearchHitsByTenant,
  searchHitBelongsToTenant,
} from '../tenantSearchHitFilter';

describe('tenantSearchHitFilter', () => {
  it('keeps strict tenant scoping for search hits', () => {
    expect(searchHitBelongsToTenant({ tenantId: 'default' }, 'default')).toBe(true);
    expect(searchHitBelongsToTenant({ tenantId: 'makadi-bay' }, 'default')).toBe(false);
  });

  it('deduplicates translated records and prefers English on English storefronts', () => {
    const results = filterTourSearchHitsByTenant(
      [
        {
          objectID: 'tour-de',
          tenantId: 'default',
          slug: 'sharm-safari',
          title: 'Sharm Safari mit Kamel und Abendessen',
          duration: '6 Stunden',
        },
        {
          objectID: 'tour-en',
          tenantId: 'default',
          slug: 'sharm-safari',
          title: 'Sharm Safari with Camel Ride and Dinner',
          duration: '6 hours',
        },
      ],
      'default',
      'en'
    );

    expect(results).toHaveLength(1);
    expect(results[0].objectID).toBe('tour-en');
    expect(results[0].title).toBe('Sharm Safari with Camel Ride and Dinner');
  });

  it('removes German-only orphan records from English search results', () => {
    const results = filterTourSearchHitsByTenant(
      [
        {
          objectID: 'tour-de',
          tenantId: 'default',
          slug: 'farsha-private-tour',
          title: 'Private Tour zur Farsha Lounge mit Abholung',
          duration: '4 Stunden',
        },
      ],
      'default',
      'en'
    );

    expect(results).toEqual([]);
  });

  it('uses a German translation bucket on German storefronts', () => {
    const results = filterTourSearchHitsByTenant(
      [
        {
          objectID: 'tour-source',
          tenantId: 'sharm-ausfluege',
          slug: 'sharm-safari',
          title: 'Sharm Safari with Camel Ride and Dinner',
          duration: '6 hours',
          translations: {
            de: {
              title: 'Sharm Safari mit Kamel und Abendessen',
              duration: '6 Stunden',
            },
          },
        },
      ],
      'sharm-ausfluege',
      'de'
    );

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Sharm Safari mit Kamel und Abendessen');
    expect(results[0].duration).toBe('6 Stunden');
  });
});
