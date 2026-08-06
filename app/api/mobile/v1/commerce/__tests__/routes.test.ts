jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: init.status || 200,
      headers: init.headers || {},
      json: async () => body,
    }),
  },
}));

const mockDbConnect = jest.fn();
const mockEnforcePublicActionLimits = jest.fn();
const mockQuote = jest.fn();
const mockAvailability = jest.fn();
const mockHold = jest.fn();
const mockRelease = jest.fn();

jest.mock('@/lib/dbConnect', () => (...args: unknown[]) => mockDbConnect(...args));
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  enforcePublicActionLimits: (...args: unknown[]) => mockEnforcePublicActionLimits(...args),
}));
jest.mock('@/lib/checkout/mobileCommerce', () => {
  class MobileCommerceError extends Error {
    constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
      super(message);
    }
  }
  return {
    MOBILE_COMMERCE_CONTRACT: 'eeo.mobile-commerce.v1',
    MobileCommerceError,
    createMobileCommerceQuote: (...args: unknown[]) => mockQuote(...args),
    getMobileCommerceAvailability: (...args: unknown[]) => mockAvailability(...args),
    createMobileCommerceHold: (...args: unknown[]) => mockHold(...args),
    releaseMobileCommerceHold: (...args: unknown[]) => mockRelease(...args),
  };
});
jest.mock('@/lib/checkout/inventoryHolds', () => {
  class InventoryHoldError extends Error {
    status = 409;
    constructor(public code: string, message: string) { super(message); }
  }
  return { InventoryHoldError };
});

import { MobileCommerceError } from '@/lib/checkout/mobileCommerce';
import { POST as quotePost } from '@/app/api/mobile/v1/commerce/quote/route';
import { POST as availabilityPost } from '@/app/api/mobile/v1/commerce/availability/route';
import { POST as holdPost } from '@/app/api/mobile/v1/commerce/hold/route';
import { POST as releasePost } from '@/app/api/mobile/v1/commerce/release/route';

function request(body: unknown) {
  return {
    headers: { get: () => null },
    json: async () => body,
  } as never;
}

describe('mobile commerce v1 route contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
    mockEnforcePublicActionLimits.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    mockQuote.mockResolvedValue({ quote: { quoteVersion: 'mqv1_quote' }, quoteToken: 'quote-token' });
    mockAvailability.mockResolvedValue({ availability: { available: 4 } });
    mockHold.mockResolvedValue({ status: 'active', holdToken: 'hold-token' });
    mockRelease.mockResolvedValue({ status: 'released', released: true });
  });

  it.each([
    ['quote', quotePost, mockQuote, 200],
    ['availability', availabilityPost, mockAvailability, 200],
    ['hold', holdPost, mockHold, 201],
    ['release', releasePost, mockRelease, 200],
  ])('serves POST /%s with private no-store responses', async (_name, post, operation, status) => {
    const body = { contractVersion: 'eeo.mobile-commerce.v1', tenantId: 'default' };
    const response = await post(request(body)) as any;
    const payload = await response.json();

    expect(response.status).toBe(status);
    expect(response.headers['Cache-Control']).toBe('private, no-store');
    expect(response.headers['X-EEO-Commerce-Contract']).toBe('eeo.mobile-commerce.v1');
    expect(payload.success).toBe(true);
    expect(operation).toHaveBeenCalledWith(body);
  });

  it('returns typed fail-closed errors without invoking a later mutation', async () => {
    mockHold.mockRejectedValue(new MobileCommerceError(409, 'PRICE_CHANGED', 'Request a new quote.'));
    const response = await holdPost(request({ contractVersion: 'eeo.mobile-commerce.v1', tenantId: 'default' })) as any;
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      success: false,
      error: { code: 'PRICE_CHANGED', message: 'Request a new quote.' },
    });
  });

  it('rate-limits hold creation before the inventory operation', async () => {
    mockEnforcePublicActionLimits.mockResolvedValue({ allowed: false, retryAfterSeconds: 45 });
    const response = await holdPost(request({ contractVersion: 'eeo.mobile-commerce.v1', tenantId: 'default' })) as any;

    expect(response.status).toBe(429);
    expect(response.headers['Retry-After']).toBe('45');
    expect(mockHold).not.toHaveBeenCalled();
  });
});
