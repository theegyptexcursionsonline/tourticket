import {
  dedupeAdminDestinations,
  normalizeDestinationSlug,
} from '../destinationDeduplication';

describe('destinationDeduplication', () => {
  it('normalizes destination slugs', () => {
    expect(normalizeDestinationSlug(' Cairo, Egypt! ')).toBe('cairo-egypt');
    expect(normalizeDestinationSlug('Dahab   Town')).toBe('dahab-town');
  });

  it('returns one admin destination per slug and aggregates duplicate tour counts', () => {
    const destinations = [
      {
        _id: 'a',
        name: 'Cairo',
        slug: 'cairo',
        isPublished: true,
        featured: false,
        image: '',
      },
      {
        _id: 'b',
        name: 'Cairo',
        slug: 'cairo',
        isPublished: true,
        featured: true,
        image: '/cairo.jpg',
      },
      {
        _id: 'c',
        name: 'Dahab Town',
        slug: 'dahab-town',
        isPublished: true,
      },
    ];

    const deduped = dedupeAdminDestinations(destinations, {
      a: 3,
      b: 26,
      c: 1,
    });

    expect(deduped).toHaveLength(2);
    expect(deduped.find((destination) => destination.slug === 'cairo')).toMatchObject({
      _id: 'b',
      name: 'Cairo',
      tourCount: 29,
      duplicateIds: ['a', 'b'],
      duplicateCount: 2,
    });
    expect(deduped.find((destination) => destination.slug === 'dahab-town')).toMatchObject({
      tourCount: 1,
      duplicateCount: 1,
    });
  });
});
