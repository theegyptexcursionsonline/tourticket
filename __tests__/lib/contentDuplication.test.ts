import {
  buildAttractionPageDuplicate,
  buildCategoryDuplicate,
  buildDestinationDuplicate,
  buildTourDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
  duplicateIdentity,
} from '@/lib/admin/contentDuplication';

describe('content duplication identity', () => {
  it('creates deterministic copy labels, strips an existing copy suffix, and stays within schema limits', () => {
    expect(duplicateIdentity({
      label: 'Orange Bay (Copy)',
      slug: 'orange-bay-copy',
      attempt: 2,
      labelLimit: 20,
      slugLimit: 20,
      fallback: 'Tour',
    })).toEqual({ label: 'Orange Bay (Copy 2)', slug: 'orange-bay-copy-2' });

    const bounded = duplicateIdentity({
      label: 'A'.repeat(250),
      slug: 'b'.repeat(150),
      attempt: 25,
      labelLimit: 100,
      slugLimit: 100,
      fallback: 'Page',
    });
    expect(bounded.label).toHaveLength(100);
    expect(bounded.slug).toHaveLength(100);
    expect(bounded.label.endsWith('(Copy 25)')).toBe(true);
    expect(bounded.slug.endsWith('-copy-25')).toBe(true);
  });
});

describe('draft builders', () => {
  it('duplicates authored Tour content but resets identity, publication, metrics, reviews, and option pricing keys', () => {
    const duplicate = buildTourDuplicate({
      _id: 'source-id',
      tenantId: 'foreign-tenant',
      title: 'Orange Bay',
      slug: 'orange-bay',
      description: 'A sufficiently complete source description.',
      destination: 'destination-1',
      category: ['category-1'],
      images: ['hero.jpg'],
      bookingOptions: [{
        _id: 'embedded-option-id',
        id: 'legacy-option-id',
        pricingKey: 'orange-bay-old-key',
        type: 'standard',
        label: 'Standard',
        price: 40,
      }],
      addOns: [{ _id: 'embedded-addon-id', name: 'Lunch', description: 'Fresh lunch onboard', price: 10 }],
      reviews: ['review-1'],
      rating: 4.9,
      bookings: 200,
      pricingSummary: { fromPrice: 40, currency: 'USD', version: 9 },
      pricingSearchProjection: { status: 'verified' },
      createdBy: { id: 'old-admin' },
      archivedAt: new Date(),
      translations: new Map([['de', { title: 'Orange Bucht' }]]),
    }, {
      id: 'new-tour-id',
      attempt: 1,
      actor: { id: 'new-admin', name: 'Editor', email: 'editor@example.com' },
    });

    expect(duplicate).toEqual(expect.objectContaining({
      _id: 'new-tour-id',
      tenantId: 'default',
      title: 'Orange Bay (Copy)',
      slug: 'orange-bay-copy',
      isPublished: false,
      isFeatured: false,
      reviews: [],
      rating: 0,
      bookings: 0,
      createdBy: { id: 'new-admin', name: 'Editor', email: 'editor@example.com' },
      updatedBy: { id: 'new-admin', name: 'Editor', email: 'editor@example.com' },
      translations: { de: { title: 'Orange Bucht' } },
    }));
    expect(duplicate).not.toHaveProperty('archivedAt');
    expect(duplicate).not.toHaveProperty('pricingSummary');
    expect(duplicate).not.toHaveProperty('pricingSearchProjection');
    expect(duplicate.bookingOptions).toEqual([
      expect.objectContaining({ type: 'standard', label: 'Standard', price: 40 }),
    ]);
    expect((duplicate.bookingOptions as Array<Record<string, unknown>>)[0]).not.toHaveProperty('_id');
    expect((duplicate.bookingOptions as Array<Record<string, unknown>>)[0]).not.toHaveProperty('id');
    expect((duplicate.bookingOptions as Array<Record<string, unknown>>)[0].pricingKey).not.toBe('orange-bay-old-key');
    expect((duplicate.addOns as Array<Record<string, unknown>>)[0]).not.toHaveProperty('_id');
  });

  it('creates unpublished, unfeatured Destination and Page drafts without copying counters or archive state', () => {
    const destination = buildDestinationDuplicate({
      name: 'Fayoum', slug: 'fayoum', description: 'Oasis', tourCount: 88,
      isPublished: true, featured: true, archivedAt: new Date(), highlights: ['Waterfalls'],
    }, 1, { id: 'editor-1', name: 'Sara', email: 'sara@example.com' });
    expect(destination).toEqual(expect.objectContaining({
      name: 'Fayoum (Copy)', slug: 'fayoum-copy', tenantId: 'default',
      isPublished: false, featured: false, tourCount: 0, highlights: ['Waterfalls'],
      createdBy: { id: 'editor-1', name: 'Sara', email: 'sara@example.com' },
      updatedBy: { id: 'editor-1', name: 'Sara', email: 'sara@example.com' },
    }));
    expect(destination).not.toHaveProperty('archivedAt');

    const page = buildAttractionPageDuplicate({
      title: 'Egypt Attractions', slug: 'egypt-attractions', pageType: 'attraction',
      description: 'Guide', gridTitle: 'Tours', isPublished: true, featured: true,
    }, { id: 'new-page-id', attempt: 1, actor: { id: 'editor-1', name: 'Sara' } });
    expect(page).toEqual(expect.objectContaining({
      _id: 'new-page-id', title: 'Egypt Attractions (Copy)', slug: 'egypt-attractions-copy',
      tenantId: 'default', isPublished: false, featured: false,
      createdBy: { id: 'editor-1', name: 'Sara' }, updatedBy: { id: 'editor-1', name: 'Sara' },
    }));

    const category = buildCategoryDuplicate({
      name: 'Boat Tours', slug: 'boat-tours', description: 'Sailing', tourCount: 12,
      isPublished: true, featured: true,
    }, { id: 'new-category-id', attempt: 1, actor: { id: 'editor-1', name: 'Sara' } });
    expect(category).toEqual(expect.objectContaining({
      _id: 'new-category-id', name: 'Boat Tours (Copy)', slug: 'boat-tours-copy',
      tenantId: 'default', isPublished: false, featured: false, tourCount: 0,
      createdBy: { id: 'editor-1', name: 'Sara' }, updatedBy: { id: 'editor-1', name: 'Sara' },
    }));
  });
});

describe('atomic unique-name retries', () => {
  it('retries only duplicate-key races with the next identity', async () => {
    const create = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('collision'), { code: 11000 }))
      .mockResolvedValueOnce({ id: 'created' });
    const result = await createUniqueDuplicate({
      build: (attempt) => ({ attempt }),
      create,
    });
    expect(result).toEqual({ id: 'created' });
    expect(create).toHaveBeenNthCalledWith(1, { attempt: 1 });
    expect(create).toHaveBeenNthCalledWith(2, { attempt: 2 });
  });

  it('does not hide validation or provider failures behind another retry', async () => {
    const failure = new Error('validation failed');
    const create = jest.fn().mockRejectedValue(failure);
    await expect(createUniqueDuplicate({ build: () => ({}), create })).rejects.toBe(failure);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('fails clearly after bounded collisions', async () => {
    await expect(createUniqueDuplicate({
      build: (attempt) => ({ attempt }),
      create: jest.fn().mockRejectedValue(Object.assign(new Error('collision'), { code: 11000 })),
      maxAttempts: 2,
    })).rejects.toBeInstanceOf(DuplicateIdentityExhaustedError);
  });
});
