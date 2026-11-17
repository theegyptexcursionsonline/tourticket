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
const { localizeParentPage } = require('@/lib/content/localizeParentPage') as typeof import('@/lib/content/localizeParentPage');

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

export {};
