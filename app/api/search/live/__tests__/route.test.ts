jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: ResponseInit = {}) => ({
      status: init.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: class ObjectId {} } },
}));

const lean = jest.fn();
const limit = jest.fn(() => ({ lean }));
const sort = jest.fn(() => ({ limit }));
const populate = jest.fn(() => ({ sort }));
const select = jest.fn(() => ({ populate }));
const find = jest.fn((_query: unknown) => ({ select }));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { find: (query: unknown) => find(query) },
}));

import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { GET } from '../route';

describe('GET /api/search/live', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lean.mockResolvedValue([{ _id: 'main-tour', title: 'Sharm English tour', tenantId: 'default' }]);
  });

  it('combines keyword matching with the main-site tenant scope', async () => {
    const response = await GET(new Request('https://example.test/api/search/live?q=sharm') as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      isPublished: true,
      $and: [expect.any(Object), DEFAULT_TENANT_FILTER],
    }));
    expect(select).toHaveBeenCalledWith(expect.stringContaining('tenantId'));
  });
});
