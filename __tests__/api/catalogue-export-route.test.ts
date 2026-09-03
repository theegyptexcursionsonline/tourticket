export {};

const mockFind = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers = new Map<string, string>();
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) { this.data = data; this.status = init?.status || 200; }
    static json(data: unknown, init?: { status?: number }) { return new MockNextResponse(data, init); }
    async json() { return this.data; }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: { find: (...args: unknown[]) => mockFind(...args) } }));

import { GET } from '@/app/api/catalogue/export/route';
import { buildCatalogueDoc } from '@/lib/catalogue/export';

function chain(result: unknown[]) {
  const c: Record<string, unknown> = {};
  for (const key of ['select', 'populate', 'sort', 'limit']) c[key] = jest.fn(() => c);
  c.lean = jest.fn().mockResolvedValue(result);
  return c;
}

const tour = (over: Record<string, unknown> = {}) => ({
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  title: 'Fictional Pyramids Day Trip',
  slug: 'fictional-pyramids-day-trip',
  description: 'A fictional guided day trip.',
  duration: '8 hours',
  price: 60,
  whatsIncluded: ['Hotel pickup', 'Entry tickets'],
  whatsNotIncluded: ['Tips'],
  cancellationPolicy: 'Free cancellation up to 24 hours before.',
  destination: { name: 'Cairo', slug: 'cairo' },
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  ...over,
});

describe('GET /api/catalogue/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns published default-tenant tours as stable documents with a citable URL', async () => {
    mockFind.mockReturnValue(chain([tour()]));
    const response = await GET(new Request('https://site.test/api/catalogue/export'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.documents[0].url).toMatch(/\/fictional-pyramids-day-trip$/);
    expect(body.documents[0].text).toContain('Free cancellation up to 24 hours before.');
    expect(body.documents[0].contentHash).toHaveLength(64);
    const filter = mockFind.mock.calls[0][0];
    expect(filter.isPublished).toBe(true);
    expect(filter.archivedAt).toEqual({ $in: [null, undefined] });
  });

  it('paginates: nextCursor is set only when the page is full', async () => {
    mockFind.mockReturnValue(chain([tour()]));
    const partial = await (await GET(new Request('https://site.test/api/catalogue/export?limit=2'))).json();
    expect(partial.nextCursor).toBeNull();

    mockFind.mockReturnValue(chain([tour(), tour()]));
    const full = await (await GET(new Request('https://site.test/api/catalogue/export?limit=2'))).json();
    expect(full.nextCursor).toBe('507f1f77bcf86cd799439011');
  });

  it('clamps the page size and ignores a malformed cursor', async () => {
    mockFind.mockReturnValue(chain([]));
    await GET(new Request('https://site.test/api/catalogue/export?limit=9999&cursor=not-an-id'));
    expect(mockFind.mock.calls[0][0]._id).toBeUndefined();
    expect(mockFind.mock.results[0].value.limit).toHaveBeenCalledWith(100);
  });

  it('never exposes operational or personal fields', async () => {
    mockFind.mockReturnValue(chain([tour({
      createdBy: { name: 'Someone', email: 'someone@example.test' },
      availability: { slots: [{ time: '08:00' }] },
      revenueGuestPrices: { adult: 10, child: 5, infant: 0 },
    })]));
    const body = await (await GET(new Request('https://site.test/api/catalogue/export'))).json();
    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain('someone@example.test');
    expect(serialised).not.toContain('revenueGuestPrices');
    expect(Object.keys(body.documents[0]).sort()).toEqual(['contentHash', 'id', 'slug', 'text', 'title', 'updatedAt', 'url']);
  });

  it('an unchanged tour hashes identically and a content change does not', () => {
    const a = buildCatalogueDoc(tour(), 'https://site.test');
    const b = buildCatalogueDoc(tour(), 'https://site.test');
    const changed = buildCatalogueDoc(tour({ cancellationPolicy: 'Free cancellation up to 48 hours before.' }), 'https://site.test');
    expect(a?.contentHash).toBe(b?.contentHash);
    expect(changed?.contentHash).not.toBe(a?.contentHash);
  });

  it('a tour without a slug or title is skipped rather than emitted with a broken link', () => {
    expect(buildCatalogueDoc(tour({ slug: '' }), 'https://site.test')).toBeNull();
    expect(buildCatalogueDoc(tour({ title: '' }), 'https://site.test')).toBeNull();
  });

  it('a database failure is a 500 with no internal detail', async () => {
    mockFind.mockImplementation(() => { throw new Error("connection string user 'root' failed"); });
    const response = await GET(new Request('https://site.test/api/catalogue/export'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('root');
  });
});
