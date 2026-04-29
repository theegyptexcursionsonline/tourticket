import {
  selectLocalizedTaxonomyEntries,
  selectLocalizedTourCandidate,
  selectLocalizedTours,
} from '../localizedCollections';

describe('localizedCollections', () => {
  it('prefers the default English tour on non-German routes', () => {
    const tours = [
      {
        _id: 'tour-en',
        slug: 'desert-safari',
        title: 'Desert Safari Adventure',
        description: 'Ride across the dunes with a local guide.',
        tenantId: 'default',
        translations: {
          de: {
            title: 'Wuestensafari Abenteuer',
          },
        },
      },
      {
        _id: 'tour-de',
        slug: 'desert-safari',
        title: 'Wuestensafari Abenteuer',
        description: 'Gefuehrte Tour durch die Duenen.',
        tenantId: 'aegypten-ausfluege',
      },
    ];

    const [selected] = selectLocalizedTours(tours, 'en');

    expect(selected?._id).toBe('tour-en');
    expect(selected?.title).toBe('Desert Safari Adventure');
  });

  it('can keep the source tour when it carries German translations', () => {
    const tours = [
      {
        _id: 'tour-en',
        slug: 'desert-safari',
        title: 'Desert Safari Adventure',
        description: 'Ride across the dunes with a local guide.',
        tenantId: 'default',
        translations: {
          de: {
            title: 'Wuestensafari Abenteuer',
            description: 'Gefuehrte Tour durch die Duenen.',
          },
        },
      },
      {
        _id: 'tour-de',
        slug: 'desert-safari',
        title: 'Wuestensafari Abenteuer',
        description: 'Gefuehrte Tour durch die Duenen.',
        tenantId: 'aegypten-ausfluege',
      },
    ];

    const selected = selectLocalizedTourCandidate(tours, 'de');

    expect(selected?._id).toBe('tour-en');
    expect(selected?.translations?.de?.title).toBe('Wuestensafari Abenteuer');
  });

  it('prefers English taxonomy labels on English routes', () => {
    const categories = [
      {
        _id: 'cat-en',
        slug: 'adventure-activities',
        name: 'Adventure Activities',
        description: 'Thrilling outdoor experiences.',
        translations: {
          de: {
            name: 'Abenteueraktivitaeten',
          },
        },
      },
      {
        _id: 'cat-de',
        slug: 'adventure-activities',
        name: 'Abenteueraktivitaeten',
        description: 'Spannende gefuehrte Aktivitaeten.',
      },
    ];

    const [selected] = selectLocalizedTaxonomyEntries(
      categories,
      'en',
      ['name', 'description', 'metaTitle', 'metaDescription']
    );

    expect(selected?._id).toBe('cat-en');
    expect(selected?.name).toBe('Adventure Activities');
  });

  it('can keep the source taxonomy record when it carries German translations', () => {
    const destinations = [
      {
        _id: 'dest-en',
        slug: 'cairo',
        name: 'Cairo',
        description: 'Historic capital of Egypt.',
        translations: {
          de: {
            name: 'Kairo',
            description: 'Historische Hauptstadt Aegyptens.',
          },
        },
      },
      {
        _id: 'dest-de',
        slug: 'cairo',
        name: 'Kairo',
        description: 'Historische Hauptstadt Aegyptens.',
      },
    ];

    const [selected] = selectLocalizedTaxonomyEntries(
      destinations,
      'de',
      ['name', 'description', 'country', 'metaTitle', 'metaDescription']
    );

    expect(selected?._id).toBe('dest-en');
    expect(selected?.translations?.de?.name).toBe('Kairo');
  });
});
