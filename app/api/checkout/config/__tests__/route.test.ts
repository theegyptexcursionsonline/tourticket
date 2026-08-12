const mockDbConnect = jest.fn();
const mockFindOne = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200,
      headers: { get: (name: string) => Object.entries(init.headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] || null },
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: () => mockDbConnect() }));
jest.mock('@/lib/models/CheckoutSettings', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => mockFindOne(...args) },
}));

import { GET } from '@/app/api/checkout/config/route';

const settingsQuery = (value: unknown) => ({
  select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }),
});

describe('GET /api/checkout/config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the saved public payment experience without caching it', async () => {
    mockFindOne.mockReturnValue(settingsQuery({ paymentExperience: 'hosted' }));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({ success: true, paymentExperience: 'hosted' });
  });

  it('uses modal only when no settings row exists', async () => {
    mockFindOne.mockReturnValue(settingsQuery(null));
    await expect((await GET()).json()).resolves.toMatchObject({ paymentExperience: 'modal' });
  });

  it('distinguishes a database failure from an empty setting', async () => {
    mockDbConnect.mockRejectedValueOnce(new Error('database down'));
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'CHECKOUT_CONFIGURATION_UNAVAILABLE' });
  });
});
