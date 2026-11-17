/**
 * @jest-environment node
 */
const records: Record<string, Record<string, unknown> | null> = {};
const calls: Array<{ model: string; filter: Record<string, unknown>; fields: string }> = [];
const model = (name: string) => ({
  findOne: (filter: Record<string, unknown>) => ({
    select: (fields: string) => ({
      lean: async () => {
        calls.push({ model: name, filter, fields });
        if (records.__throw) throw new Error('db down');
        return records[`${name}:${filter.slug}`] ?? null;
      },
    }),
  }),
});
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: model('page') }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: model('category') }));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: model('destination') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { localizeParentPage, prefetchParentPage } = require('@/lib/content/localizeParentPage') as typeof import('@/lib/content/localizeParentPage');

beforeEach(() => {
  for (const key of Object.keys(records)) delete records[key];
  calls.length = 0;
});

const parent = { slug: 'aswan-attractions', label: 'Aswan Attractions', kind: 'attraction' as const };

describe('localizeParentPage', () => {
  it('uses the parent page translation for the breadcrumb label', async () => {
    records['page:aswan-attractions'] = { title: 'Aswan Attractions', translations: { ar: { title: 'معالم أسوان' } } };
    await expect(localizeParentPage(parent, 'ar')).resolves.toEqual({ ...parent, label: 'معالم أسوان' });
    expect(calls[0].filter).toMatchObject({ slug: 'aswan-attractions', $or: expect.arrayContaining([{ tenantId: 'default' }]) });
    expect(calls[0].fields).toBe('title translations');
  });

  it('keeps the stored label when the parent has no translation, is missing, or the lookup fails', async () => {
    records['page:aswan-attractions'] = { title: 'Aswan Attractions' };
    await expect(localizeParentPage(parent, 'ar')).resolves.toBe(parent);
    delete records['page:aswan-attractions'];
    await expect(localizeParentPage(parent, 'ar')).resolves.toBe(parent);
    records.__throw = {};
    await expect(localizeParentPage(parent, 'ar')).resolves.toBe(parent);
  });

  it('reads categories and destinations by their name, and leaves English and system parents alone', async () => {
    records['category:luxor-tours'] = { name: 'Luxor Tours', translations: { de: { name: 'Luxor-Touren' } } };
    await expect(localizeParentPage({ slug: 'luxor-tours', label: 'Luxor Tours', kind: 'category' }, 'de')).resolves.toMatchObject({ label: 'Luxor-Touren' });
    expect(calls.at(-1)?.fields).toBe('name translations');
    calls.length = 0;
    await expect(localizeParentPage(parent, 'en')).resolves.toBe(parent);
    await expect(localizeParentPage({ slug: 'egypt', label: 'Egypt', kind: 'landing' }, 'ar')).resolves.toMatchObject({ label: 'Egypt' });
    await expect(localizeParentPage(null, 'ar')).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe('parent read started with the page read', () => {
  it('starts at once and is reused, so the label costs no read after the page', async () => {
    records['page:aswan-attractions'] = { title: 'Aswan Attractions', translations: { ar: { title: 'معالم أسوان' } } };
    const early = prefetchParentPage('aswan-attractions', 'ar');
    expect(early).toBeDefined();
    await early!.doc;
    expect(calls).toHaveLength(1);
    await expect(localizeParentPage(parent, 'ar', early)).resolves.toEqual({ ...parent, label: 'معالم أسوان' });
    expect(calls).toHaveLength(1);
  });

  it('is ignored when the page turns out to have another parent or a non-page parent', async () => {
    records['page:luxor-attractions'] = { title: 'Luxor Attractions', translations: { ar: { title: 'معالم الأقصر' } } };
    records['page:aswan-attractions'] = { title: 'Aswan Attractions', translations: { ar: { title: 'معالم أسوان' } } };
    const wrong = prefetchParentPage('luxor-attractions', 'ar');
    await expect(localizeParentPage(parent, 'ar', wrong)).resolves.toMatchObject({ label: 'معالم أسوان' });
    records['category:aswan-attractions'] = { name: 'Aswan', translations: { ar: { name: 'أسوان' } } };
    const pageGuess = prefetchParentPage('aswan-attractions', 'ar');
    await expect(localizeParentPage({ slug: 'aswan-attractions', label: 'Aswan', kind: 'category' }, 'ar', pageGuess)).resolves.toMatchObject({ label: 'أسوان' });
  });

  it('does nothing in English or without a parent, and a failed early read keeps the stored label', async () => {
    expect(prefetchParentPage('aswan-attractions', 'en')).toBeUndefined();
    expect(prefetchParentPage('', 'ar')).toBeUndefined();
    expect(prefetchParentPage(undefined, 'ar')).toBeUndefined();
    expect(calls).toHaveLength(0);
    records.__throw = {};
    const early = prefetchParentPage('aswan-attractions', 'ar');
    await expect(localizeParentPage(parent, 'ar', early)).resolves.toBe(parent);
  });
});

export {};
