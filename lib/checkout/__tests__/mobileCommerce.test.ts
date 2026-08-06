const mockSecureCartPricing = jest.fn();
const mockInspectInventoryAvailability = jest.fn();
const mockCreateInventoryHolds = jest.fn();
const mockReleaseInventoryHolds = jest.fn();
const mockSignToken = jest.fn();
const mockVerifyToken = jest.fn();

jest.mock('@/lib/checkout/serverCartPricing', () => ({
  secureCartPricing: (...args: unknown[]) => mockSecureCartPricing(...args),
}));
jest.mock('@/lib/checkout/inventoryHolds', () => ({
  createInventoryHolds: (...args: unknown[]) => mockCreateInventoryHolds(...args),
  inspectInventoryAvailability: (...args: unknown[]) => mockInspectInventoryAvailability(...args),
  releaseInventoryHolds: (...args: unknown[]) => mockReleaseInventoryHolds(...args),
}));
jest.mock('@/lib/jwt', () => ({
  signToken: (...args: unknown[]) => mockSignToken(...args),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));
jest.mock('@/lib/revenue/pricingResolver', () => ({ STANDARD_OPTION_KEY: 'standard' }));

import {
  createMobileCommerceHold,
  createMobileCommerceQuote,
  getMobileCommerceAvailability,
  MOBILE_COMMERCE_CONTRACT,
  MobileCommerceError,
  releaseMobileCommerceHold,
} from '@/lib/checkout/mobileCommerce';

const target = {
  contractVersion: MOBILE_COMMERCE_CONTRACT,
  tenantId: 'default',
  tourId: '507f1f77bcf86cd799439011',
  pricingKey: 'premium-key',
  date: '2099-08-17',
  time: '10:00',
  guests: { adults: 2, children: 1, infants: 0 },
  addOns: [{ id: '507f1f77bcf86cd799439012', quantity: 1 }],
};

const pricedItem = {
  _id: target.tourId,
  id: target.tourId,
  title: 'Canonical tour',
  quantity: 2,
  childQuantity: 1,
  infantQuantity: 0,
  selectedDate: target.date,
  selectedTime: target.time,
  price: 120,
  discountPrice: 120,
  originalPrice: 150,
  selectedBookingOption: {
    id: 'option-0', pricingKey: target.pricingKey, title: 'Premium', price: 120, originalPrice: 150,
  },
  guestPrices: { adult: 120, child: 60, infant: 0 },
  priceVersion: 4,
  priceSourceVersion: `pv1_${'a'.repeat(64)}`,
  priceExecutionId: 'exec-1',
  priceOverrideId: 'override-1',
  priceSource: 'override' as const,
  selectedAddOns: { '507f1f77bcf86cd799439012': 1 },
  selectedAddOnDetails: {
    '507f1f77bcf86cd799439012': {
      id: '507f1f77bcf86cd799439012', title: 'Lunch', price: 25, category: 'Food', perGuest: true,
    },
  },
  availableAddOns: [{
    id: '507f1f77bcf86cd799439012', title: 'Lunch', price: 25, category: 'Food', perGuest: true,
  }],
};

const availability = {
  tenantId: 'default' as const,
  tourId: target.tourId,
  date: target.date,
  time: target.time,
  optionKey: target.pricingKey,
  requestedGuests: 3,
  startsAtUtc: '2099-08-17T08:00:00.000Z',
  capacity: 5,
  booked: 1,
  activeHeld: 0,
  available: 4,
  availableAfterHold: 1,
};

describe('mobile canonical commerce adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureCartPricing.mockResolvedValue([{ ...pricedItem }]);
    mockInspectInventoryAvailability.mockResolvedValue({ ...availability });
    mockCreateInventoryHolds.mockResolvedValue([{ state: 'active', expiresAt: new Date(Date.now() + 15 * 60_000) }]);
    mockReleaseInventoryHolds.mockResolvedValue(1);
    mockSignToken.mockImplementation(async (payload: Record<string, unknown>) => payload.scope === 'mobile-commerce:hold' ? 'quote-token' : 'hold-token');
  });

  it('fails closed before pricing for any non-main tenant', async () => {
    await expect(createMobileCommerceQuote({ ...target, tenantId: 'other' }))
      .rejects.toMatchObject({ code: 'TENANT_FORBIDDEN', status: 403 });
    expect(mockSecureCartPricing).not.toHaveBeenCalled();
  });

  it('quotes through serverCartPricing and returns stable pricing plus authored add-ons', async () => {
    const result = await createMobileCommerceQuote(target);

    expect(mockSecureCartPricing).toHaveBeenCalledWith([
      expect.objectContaining({
        id: target.tourId,
        selectedBookingOption: { pricingKey: target.pricingKey },
        selectedDate: target.date,
        selectedTime: target.time,
      }),
    ], { allowUnversionedQuote: true });
    expect(result.quote.pricing).toMatchObject({
      overrideVersion: 4,
      catalogueVersion: pricedItem.priceSourceVersion,
      subtotal: 375,
    });
    expect(result.quote.authoredAddOns).toEqual(pricedItem.availableAddOns);
    expect(result.quote.quoteVersion).toMatch(/^mqv1_[a-f0-9]{64}$/);
    expect(result.quoteToken).toBe('quote-token');
  });

  it('uses the same price and inventory authorities for the availability contract', async () => {
    const result = await getMobileCommerceAvailability(target);
    expect(result.availability).toEqual(availability);
    expect(result.quoteVersion).toMatch(/^mqv1_[a-f0-9]{64}$/);
    expect(mockInspectInventoryAvailability).toHaveBeenCalledWith(expect.objectContaining({
      selectedBookingOption: expect.objectContaining({ pricingKey: target.pricingKey }),
    }));
  });

  it('requires a valid, target-bound quote capability before creating a hold', async () => {
    mockVerifyToken.mockResolvedValue(null);
    await expect(createMobileCommerceHold({
      ...target,
      quoteToken: 'expired-token',
      quoteVersion: `mqv1_${'a'.repeat(64)}`,
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
    })).rejects.toMatchObject({ code: 'CAPABILITY_INVALID', status: 401 });
    expect(mockCreateInventoryHolds).not.toHaveBeenCalled();
  });

  it('preserves one reservation and expiry across idempotent hold retries', async () => {
    const quoted = await createMobileCommerceQuote(target);
    const quoteClaims = mockSignToken.mock.calls[0][0];
    mockVerifyToken.mockResolvedValue(quoteClaims);
    const request = {
      ...target,
      quoteToken: quoted.quoteToken,
      quoteVersion: quoted.quote.quoteVersion,
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
    };

    const first = await createMobileCommerceHold(request);
    const second = await createMobileCommerceHold(request);

    expect(first.status).toBe('active');
    expect(second.expiresAt).toBe(first.expiresAt);
    expect(mockCreateInventoryHolds).toHaveBeenCalledTimes(2);
    const firstReservation = mockCreateInventoryHolds.mock.calls[0][0].reservationKey;
    const secondReservation = mockCreateInventoryHolds.mock.calls[1][0].reservationKey;
    expect(firstReservation).toMatch(/^[a-f0-9]{64}$/);
    expect(secondReservation).toBe(firstReservation);
  });

  it('rejects a stale quote before inventory is mutated', async () => {
    const quoted = await createMobileCommerceQuote(target);
    mockVerifyToken.mockResolvedValue(mockSignToken.mock.calls[0][0]);
    mockSecureCartPricing.mockResolvedValue([{ ...pricedItem, priceVersion: 5 }]);

    await expect(createMobileCommerceHold({
      ...target,
      quoteToken: quoted.quoteToken,
      quoteVersion: quoted.quote.quoteVersion,
      idempotencyKey: '11111111-1111-4111-8111-111111111111',
    })).rejects.toMatchObject({ code: 'PRICE_CHANGED', status: 409 });
    expect(mockCreateInventoryHolds).not.toHaveBeenCalled();
  });

  it('releases only through a scoped hold capability and is replay-safe', async () => {
    mockVerifyToken.mockResolvedValue({
      scope: 'mobile-commerce:release',
      contractVersion: MOBILE_COMMERCE_CONTRACT,
      tenantId: 'default',
      reservationKey: 'b'.repeat(64),
      targetBinding: 'c'.repeat(64),
      quoteVersion: `mqv1_${'d'.repeat(64)}`,
    });
    const first = await releaseMobileCommerceHold({
      contractVersion: MOBILE_COMMERCE_CONTRACT,
      tenantId: 'default',
      holdToken: 'hold-token',
    });
    mockReleaseInventoryHolds.mockResolvedValueOnce(0);
    const replay = await releaseMobileCommerceHold({
      contractVersion: MOBILE_COMMERCE_CONTRACT,
      tenantId: 'default',
      holdToken: 'hold-token',
    });

    expect(first).toMatchObject({ status: 'released', released: true, alreadyInactive: false });
    expect(replay).toMatchObject({ status: 'released', released: false, alreadyInactive: true });
    expect(mockReleaseInventoryHolds).toHaveBeenCalledWith({
      reservationKey: 'b'.repeat(64),
      reason: 'mobile_capability_release',
    });
  });

  it('uses typed fail-closed errors for malformed targets', async () => {
    await expect(createMobileCommerceQuote({ ...target, date: '2099-02-30' }))
      .rejects.toBeInstanceOf(MobileCommerceError);
  });
});
