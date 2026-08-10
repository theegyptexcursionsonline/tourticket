import {
  buildPageTypeConversionDraft,
  isAllowedCrossModelConversion,
} from '@/lib/admin/pageTypeConversion';

const id = '64b000000000000000000001';

describe('page type conversion draft builder', () => {
  it('allows only safe cross-model conversions', () => {
    expect(isAllowedCrossModelConversion('category', 'attraction')).toBe(true);
    expect(isAllowedCrossModelConversion('category', 'category-landing')).toBe(true);
    expect(isAllowedCrossModelConversion('attraction', 'category')).toBe(true);
    expect(isAllowedCrossModelConversion('category-landing', 'category')).toBe(true);
    expect(isAllowedCrossModelConversion('category', 'category')).toBe(false);
    expect(isAllowedCrossModelConversion('attraction', 'category-landing')).toBe(false);
  });

  it('transfers shared Category content to an unpublished Attraction draft', () => {
    const source = {
      _id: '64b000000000000000000000010',
      name: 'Desert Safari',
      slug: 'desert-safari',
      description: 'Shared description',
      heroImage: '/desert.jpg',
      highlights: ['Sunset'],
      translations: { ar: { name: 'سفاري الصحراء', description: 'وصف' } },
      isPublished: true,
    };
    const draft = buildPageTypeConversionDraft({
      source,
      sourceKind: 'category',
      targetKind: 'attraction',
      id,
      attempt: 1,
    });

    expect(draft).toMatchObject({
      _id: id,
      tenantId: 'default',
      title: 'Desert Safari (Attraction)',
      slug: 'desert-safari-attraction',
      description: 'Shared description',
      heroImage: '/desert.jpg',
      highlights: ['Sunset'],
      pageType: 'attraction',
      gridTitle: 'Desert Safari',
      isPublished: false,
      featured: false,
      archivedAt: null,
    });
    expect(draft.translations).toEqual({ ar: { title: 'سفاري الصحراء', description: 'وصف' } });
    expect(source).toMatchObject({ isPublished: true, name: 'Desert Safari' });
  });

  it('links a Category 2 draft to the source Category instead of breaking the catalogue', () => {
    const sourceId = '64b000000000000000000000010';
    const draft = buildPageTypeConversionDraft({
      source: { _id: sourceId, name: 'Boat Trips', slug: 'boat-trips', description: 'Trips' },
      sourceKind: 'category',
      targetKind: 'category-landing',
      id,
      attempt: 1,
    });

    expect(draft).toMatchObject({
      title: 'Boat Trips (Category 2)',
      slug: 'boat-trips-category-2',
      pageType: 'category',
      categoryId: sourceId,
      isPublished: false,
    });
  });

  it('transfers Attraction content and translations to an unpublished Category draft', () => {
    const draft = buildPageTypeConversionDraft({
      source: {
        title: 'Dolphin House',
        slug: 'dolphin-house',
        description: 'Shared description',
        longDescription: 'Long copy',
        linkedPageIds: ['64b000000000000000000000020'],
        translations: { de: { title: 'Delfinhaus', gridTitle: 'Tours' } },
      },
      sourceKind: 'attraction',
      targetKind: 'category',
      id,
      attempt: 2,
    });

    expect(draft).toMatchObject({
      name: 'Dolphin House (Category 2)',
      slug: 'dolphin-house-category-2',
      description: 'Shared description',
      longDescription: 'Long copy',
      linkedPageIds: ['64b000000000000000000000020'],
      isPublished: false,
      tourCount: 0,
    });
    expect(draft.translations).toEqual({ de: { name: 'Delfinhaus' } });
  });

  it('rejects an unsupported in-model conversion path', () => {
    expect(() => buildPageTypeConversionDraft({
      source: { name: 'Page', slug: 'page' },
      sourceKind: 'category',
      targetKind: 'category',
      id,
      attempt: 1,
    })).toThrow('Unsupported page-type conversion');
  });
});
