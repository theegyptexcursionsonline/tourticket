/**
 * @jest-environment node
 */
/*
 * The public interests list is kept for five minutes (it took ~11 s per call),
 * reads only the fields the cards show, and stays default-tenant scoped.
 */
const cacheCalls: Array<{ key: unknown; options: unknown }> = [];
jest.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown, key: unknown, options: unknown) => {
    cacheCalls.push({ key, options });
    return fn;
  },
}));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));

const finds: Record<string, { filter: unknown; select?: string }> = {};
const chain = (name: string, rows: unknown[]) =>
  jest.fn((filter: unknown) => {
    finds[name] = { filter };
    return {
      select(fields: string) {
        finds[name].select = fields;
        return { lean: async () => rows };
      },
    };
  });

const categoryRows = [
  { _id: 'c1', name: 'Day trips', slug: 'day-trips', heroImage: '/c1.jpg', featured: false, urlType: 'direct' },
  { _id: 'c2', name: 'Empty', slug: 'empty', heroImage: '/c2.jpg', featured: false },
];
const pageRows = [
  { _id: 'p1', title: 'Karnak', slug: 'karnak-temple', keywords: ['karnak', ' '], heroImage: '/p1.jpg', featured: true },
  { _id: 'p2', title: 'Broken', slug: 'broken', keywords: [], heroImage: '/p2.jpg', featured: false },
];
const countDocuments = jest.fn(async (query: { $or: Array<Record<string, unknown>> }) => {
  if (JSON.stringify(query).includes('Broken')) throw new Error('count failed');
  return 4;
});

jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: { find: chain('category', categoryRows) } }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: { find: chain('page', pageRows) } }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(async () => [{ _id: 'c1', tourCount: 7 }]),
    countDocuments: (query: { $or: Array<Record<string, unknown>> }) => countDocuments(query),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const list = require('@/lib/interests/interestsList') as typeof import('@/lib/interests/interestsList');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('@/app/api/interests/route') as typeof import('@/app/api/interests/route');

describe('interests list', () => {
  it('is stored for five minutes under a tenant key and cleared with the category pages', () => {
    expect(list.INTERESTS_REVALIDATE_SECONDS).toBe(300);
    expect(cacheCalls).toHaveLength(1);
    expect(cacheCalls[0].key).toEqual(['interests-api', 'default']);
    expect(cacheCalls[0].options).toEqual({ revalidate: 300, tags: ['category-pages'] });
  });

  it('reads only the card fields, scoped to the default tenant and published, unarchived records', async () => {
    await list.loadInterests();
    expect(finds.category.select).toBe('name slug heroImage featured urlType parentPage');
    expect(finds.page.select).toBe('title slug keywords heroImage featured urlType parentPage');
    for (const name of ['category', 'page']) {
      expect(finds[name].filter).toMatchObject({ isPublished: true, archivedAt: null, $or: expect.arrayContaining([{ tenantId: 'default' }]) });
    }
    expect(finds.page.filter).toMatchObject({ pageType: 'attraction' });
  });

  it('returns only interests with trips, featured first, and survives one failing count', async () => {
    const rows = await list.loadInterests();
    expect(rows.map((row) => row.slug)).toEqual(['karnak-temple', 'day-trips']);
    expect(rows[0]).toMatchObject({ type: 'attraction', name: 'Karnak', products: 4, image: '/p1.jpg' });
    expect(rows[1]).toMatchObject({ type: 'category', name: 'Day trips', products: 7 });
    // Blank keywords are ignored; the remaining ones are escaped patterns.
    const karnakQuery = countDocuments.mock.calls.map(([q]) => q).find((q) => JSON.stringify(q).includes('Karnak'))!;
    expect(karnakQuery.$or).toHaveLength(3);
  });

  it('the route answers with the list, and with a 500 when loading fails', async () => {
    const ok = await GET();
    expect(ok.status).toBe(200);
    await expect(ok.json()).resolves.toMatchObject({ success: true, data: [{ slug: 'karnak-temple' }, { slug: 'day-trips' }] });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Category = require('@/lib/models/Category').default as { find: jest.Mock };
    Category.find.mockImplementationOnce(() => { throw new Error('db down'); });
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const failed = await GET();
    quiet.mockRestore();
    expect(failed.status).toBe(500);
    await expect(failed.json()).resolves.toMatchObject({ success: false });
  });
});
