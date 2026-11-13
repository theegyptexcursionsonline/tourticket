/**
 * @jest-environment node
 */
// The home page blog section asks this route for the newest posts. It prints a
// title and a summary, so that is all of a translation the route hands over.
const find = jest.fn();

function chainable(value: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ['sort', 'limit', 'select', 'lean']) chain[method] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(value).then(resolve);
  return chain;
}

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('@/lib/models/Blog', () => ({ __esModule: true, default: { find: (...args: unknown[]) => find(...args) } }));

import { GET } from '@/app/api/blog/latest/route';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const post = (translations: unknown) => ({
  slug: 'guide-excellence',
  title: 'Guide Excellence Program',
  excerpt: 'Strengthening professional standards.',
  category: 'news-updates',
  readTime: 5,
  translations,
});

beforeEach(() => {
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://test';
  find.mockReset();
});

describe('latest blog posts feed', () => {
  it('hands over the translated title and summary, never the translated article', async () => {
    const stored = { ar: { title: 'برنامج التميّز', excerpt: 'تعزيز المعايير.', content: '<p>المقال كاملًا.</p>', metaTitle: 'عنوان' } };
    find.mockReturnValue(chainable([post(stored), post(new Map(Object.entries(stored))), post(undefined)]));
    const body = await (await GET()).json();

    expect(find).toHaveBeenCalledWith({ status: 'published', ...DEFAULT_TENANT_FILTER });
    expect(body.posts).toHaveLength(3);
    expect(body.posts[0].translations).toEqual({ ar: { title: 'برنامج التميّز', excerpt: 'تعزيز المعايير.' } });
    expect(body.posts[1].translations).toEqual({ ar: { title: 'برنامج التميّز', excerpt: 'تعزيز المعايير.' } });
    expect(body.posts[2].translations).toEqual({});
    expect(JSON.stringify(body)).not.toContain('المقال كاملًا');
  });

  it('answers with no posts when the read fails', async () => {
    find.mockImplementation(() => { throw new Error('down'); });
    const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await (await GET()).json()).toEqual({ posts: [] });
    errors.mockRestore();
  });
});
