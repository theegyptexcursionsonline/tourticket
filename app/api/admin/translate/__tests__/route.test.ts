// Mock NextResponse as a class to support `instanceof` checks in the route.
// The class is defined inside the factory because jest.mock is hoisted above all declarations.
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    _body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this._body = body;
      this.status = init?.status || 200;
    }

    async json() {
      return this._body;
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }
  return { NextResponse: MockNextResponse };
});

// Mock verifyAdmin
jest.mock('@/lib/auth/verifyAdmin', () => ({
  verifyAdmin: jest.fn(),
}));

// Mock auto-translate functions
const mockAutoTranslateTour = jest.fn();
const mockAutoTranslateDestination = jest.fn();
const mockAutoTranslateCategory = jest.fn();

jest.mock('@/lib/i18n/autoTranslate', () => ({
  autoTranslateTour: (...args: unknown[]) => mockAutoTranslateTour(...args),
  autoTranslateDestination: (...args: unknown[]) => mockAutoTranslateDestination(...args),
  autoTranslateCategory: (...args: unknown[]) => mockAutoTranslateCategory(...args),
}));

const { NextResponse } = jest.requireMock('next/server');
const { verifyAdmin } = jest.requireMock('@/lib/auth/verifyAdmin');

// Import POST after mocks are set up
import { POST } from '../route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as any;
}

describe('POST /api/admin/translate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdmin.mockResolvedValue({ id: 'admin1', role: 'admin' });
  });

  it('returns 403 when not authenticated as admin', async () => {
    const authResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    verifyAdmin.mockResolvedValue(authResponse);

    const response = await POST(makeRequest({ modelType: 'tour', id: '123' }));
    expect(response.status).toBe(403);
  });

  it('translates a tour successfully', async () => {
    mockAutoTranslateTour.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ modelType: 'tour', id: 'tour123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAutoTranslateTour).toHaveBeenCalledWith('tour123');
  });

  it('translates a destination successfully', async () => {
    mockAutoTranslateDestination.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ modelType: 'destination', id: 'dest123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAutoTranslateDestination).toHaveBeenCalledWith('dest123');
  });

  it('translates a category successfully', async () => {
    mockAutoTranslateCategory.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ modelType: 'category', id: 'cat123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAutoTranslateCategory).toHaveBeenCalledWith('cat123');
  });

  it('returns 400 for invalid modelType', async () => {
    const response = await POST(makeRequest({ modelType: 'blog', id: '123' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid modelType');
  });

  it('returns 400 when id is missing', async () => {
    const response = await POST(makeRequest({ modelType: 'tour' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing id');
  });

  it('returns 500 when translation throws an error', async () => {
    mockAutoTranslateTour.mockRejectedValue(new Error('OpenAI API down'));

    const response = await POST(makeRequest({ modelType: 'tour', id: 'tour123' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('OpenAI API down');
  });
});
