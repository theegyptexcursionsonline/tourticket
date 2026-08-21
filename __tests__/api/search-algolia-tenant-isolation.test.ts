export {};

const mockSearch = jest.fn();

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private data: unknown;
    constructor(data: unknown, init?: { status?: number }) {
      this.data = data;
      this.status = init?.status || 200;
    }
    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(data, init);
    }
    async json() { return this.data; }
  }
  return { NextResponse: MockNextResponse };
});

jest.mock('@/lib/algolia', () => ({
  ALGOLIA_INDEX_NAME: 'tours',
  algoliaClient: () => ({ search: mockSearch }),
}));

describe('public Algolia search tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({
      results: [{ hits: [], nbHits: 0, page: 0, nbPages: 0, hitsPerPage: 20, query: '' }],
    });
  });

  it('always scopes the main storefront to default, ignoring caller tenant input', async () => {
    const { GET } = await import('@/app/api/search/algolia/route');
    const response = await GET({
      url: 'https://egypt-excursionsonline.com/api/search/algolia?q=cairo&tenantId=sharm-ausfluege',
    } as Request);

    expect(response.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith({
      requests: [expect.objectContaining({
        filters: 'isPublished:true AND (tenantId:"default" OR tenantIds:"default")',
      })],
    });
  });
});
