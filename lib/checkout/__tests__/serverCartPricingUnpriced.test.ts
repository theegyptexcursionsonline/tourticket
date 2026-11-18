jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } } },
}));

const lean = jest.fn();
const select = jest.fn(() => ({ lean }));
const findOne = jest.fn(() => ({ select }));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: (...args: unknown[]) => (findOne as (...a: unknown[]) => unknown)(...args) },
}));

jest.mock('@/lib/revenue/pricingResolver', () => ({
  STANDARD_OPTION_KEY: 'standard',
  resolveEffectivePrice: jest.fn(),
}));

import { PriceUnavailableError, secureCartPricing } from '@/lib/checkout/serverCartPricing';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';
import { PublicInputError } from '@/lib/security/publicInput';

const TOUR_ID = '507f1f77bcf86cd799439011';

// The live Cairo Private Shopping Tour shape plus a start-time-priced option
// (18 Nov): option 2 has a 0 base and no start-time price at all.
const catalogueTour = {
  _id: { toString: () => TOUR_ID },
  title: 'Cairo Private Shopping Tour',
  discountPrice: 60,
  bookingOptions: [
    { label: 'Private Tour with Transfers', type: 'Per Person', price: 60, pricingKey: 'priced-key', timeSlots: [{ time: '11:00' }] },
    { label: 'Private Cairo Experience', type: 'Per Person', price: 0, pricingKey: 'unpriced-key', timeSlots: [{ time: '11:00' }, { time: '11:30' }] },
    {
      label: 'Shared tour', type: 'Per Person', price: 0, pricingKey: 'slot-priced-key',
      timeSlots: [{ time: '08:00', price: 116, guestPrices: { child: 116, infant: 0 } }, { time: '12:00' }],
    },
    { label: 'Private group', type: 'Per Group', price: 0, pricingKey: 'group-key' },
  ],
  addOns: [{ _id: { toString: () => 'addon-0' }, name: 'Photos', price: 25, pricingMethod: 'per_unit' }],
};

const line = (pricingKey: string, extra: Record<string, unknown> = {}) => ({
  id: TOUR_ID,
  quantity: 1,
  selectedBookingOption: { pricingKey, price: 0 },
  ...extra,
});

describe('checkout refuses an option, departure or tour with no real price', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lean.mockResolvedValue(catalogueTour);
  });

  it('still prices a normally priced option', async () => {
    const [item] = await secureCartPricing([line('priced-key', { selectedTime: '11:00' })]);
    expect(item.price).toBe(60);
  });

  it('refuses the option with a 0 base and no start-time price (was booked at $0.00)', async () => {
    const attempt = secureCartPricing([line('unpriced-key', { selectedTime: '11:30' })]);
    await expect(attempt).rejects.toBeInstanceOf(PriceUnavailableError);
    await expect(secureCartPricing([line('unpriced-key')]))
      .rejects.toMatchObject({ status: 409, code: 'PRICE_UNAVAILABLE' });
  });

  it('is a public input error, so checkout answers with a clear message before any payment', async () => {
    const error = await secureCartPricing([line('unpriced-key')]).catch((e) => e);
    expect(error).toBeInstanceOf(PublicInputError);
    expect(error.message).toMatch(/no price yet/i);
  });

  it('charges the start-time price of a 0-base option, with that departure\'s child price', async () => {
    const [item] = await secureCartPricing([line('slot-priced-key', { selectedTime: '08:00', childQuantity: 1 })]);
    expect(item.price).toBe(116);
    expect(item.guestPrices).toEqual({ adult: 116, child: 116, infant: 0 });
  });

  it('refuses the unpriced departure of that same option', async () => {
    await expect(secureCartPricing([line('slot-priced-key', { selectedTime: '12:00' })]))
      .rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses a per-group option priced at 0', async () => {
    await expect(secureCartPricing([line('group-key')])).rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses the whole cart when one line is unpriced, even beside a priced line and an add-on', async () => {
    await expect(secureCartPricing([
      line('priced-key', { selectedTime: '11:00' }),
      line('unpriced-key', { selectedTime: '11:00', selectedAddOns: { 'addon-0': 1 } }),
    ])).rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('refuses a dated quote that resolves to 0', async () => {
    jest.mocked(resolveEffectivePrice).mockResolvedValue({ version: 0, sourceVersion: 's1', prices: { adult: 0, child: 0, infant: 0 } } as never);
    await expect(secureCartPricing([line('priced-key', { selectedDate: '2026-12-01', selectedTime: '11:00' })]))
      .rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('accepts a dated quote that prices an option whose catalogue base is 0', async () => {
    jest.mocked(resolveEffectivePrice).mockResolvedValue({ version: 0, sourceVersion: 's1', prices: { adult: 116, child: 116, infant: 0 } } as never);
    const [item] = await secureCartPricing([line('slot-priced-key', { selectedDate: '2026-12-01', selectedTime: '08:00' })]);
    expect(item.price).toBe(116);
  });

  it('refuses a single-price tour whose own price is 0', async () => {
    lean.mockResolvedValueOnce({ ...catalogueTour, discountPrice: 0, bookingOptions: [] });
    await expect(secureCartPricing([{ id: TOUR_ID }])).rejects.toBeInstanceOf(PriceUnavailableError);
  });

  it('keeps pricing a single-price tour with a real price', async () => {
    lean.mockResolvedValueOnce({ ...catalogueTour, discountPrice: 45, bookingOptions: [] });
    const [item] = await secureCartPricing([{ id: TOUR_ID }]);
    expect(item.price).toBe(45);
  });
});
