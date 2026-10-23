import { bookedExtrasForFeed, type BookedExtrasSnapshot } from '../bookingFeedExtras';

const ERROR = { extrasError: 'INVALID_BOOKED_EXTRAS' };
const detail = (patch: Record<string, unknown> = {}) => ({ title: 'Saved private upgrade', price: 12.5, perGuest: false, ...patch });
const snapshot = (patch: BookedExtrasSnapshot = {}): BookedExtrasSnapshot => ({
  selectedAddOns: { upgrade: 2 },
  selectedAddOnDetails: { upgrade: detail() },
  currency: 'USD',
  ...patch,
});
const withDetail = (patch: Record<string, unknown>) => snapshot({ selectedAddOnDetails: { upgrade: detail(patch) } });

describe('booked extras for the signed feed', () => {
  it('preserves missing versus explicitly empty snapshots', () => {
    expect(bookedExtrasForFeed({})).toEqual({});
    expect(bookedExtrasForFeed({ selectedAddOns: null, selectedAddOnDetails: null })).toEqual({});
    expect(bookedExtrasForFeed({ selectedAddOnDetails: {} })).toEqual({});
    for (const selectedAddOns of [{}, new Map(), []]) {
      expect(bookedExtrasForFeed({ selectedAddOns })).toEqual({ extras: [] });
    }
    expect(bookedExtrasForFeed(snapshot({ selectedAddOns: { upgrade: 0 } }))).toEqual({ extras: [] });
  });

  it('uses the saved name, rate and units without changing the source snapshot', () => {
    const value = snapshot();
    const before = JSON.stringify(value);
    expect(bookedExtrasForFeed(value)).toEqual({ extras: [{
      id: 'upgrade', name: 'Saved private upgrade', quantity: 2, selectedQuantity: 2,
      perGuest: false, unitPrice: '12.50', totalPrice: '25.00', currency: 'USD',
    }] });
    expect(JSON.stringify(value)).toBe(before);
  });

  it('accepts Map snapshots and gives object/map reorderings the same stable order', () => {
    const values = { z: 1, a: 2 };
    const details = { z: detail({ title: 'Z extra' }), a: detail({ title: 'A extra' }) };
    const object = bookedExtrasForFeed(snapshot({ selectedAddOns: values, selectedAddOnDetails: details }));
    const mapped = bookedExtrasForFeed(snapshot({ selectedAddOns: new Map([['a', 2], ['z', 1]]), selectedAddOnDetails: new Map(Object.entries(details)) }));
    expect(mapped).toEqual(object);
    expect(object.extras?.map((extra) => extra.id)).toEqual(['a', 'z']);
  });

  it('uses recorded billed units for a per-person extra without multiplying by the party', () => {
    const value = { ...withDetail({ perGuest: true, quantity: 3 }), adultGuests: 99, childGuests: 99 };
    expect(bookedExtrasForFeed(value)).toMatchObject({ extras: [{
      quantity: 3, selectedQuantity: 2, perGuest: true, unitPrice: '12.50', totalPrice: '37.50',
    }] });
  });

  it('keeps legacy per-person billed units unknown, while preserving the saved selection and unit rate', () => {
    const value = { ...withDetail({ perGuest: true }), adultGuests: 2, childGuests: 1 };
    const result = bookedExtrasForFeed(value);
    expect(result).toEqual({ extras: [{ id: 'upgrade', name: 'Saved private upgrade', quantity: null,
      selectedQuantity: 2, perGuest: true, unitPrice: '12.50', currency: 'USD' }] });
    expect(result.extras?.[0]).not.toHaveProperty('totalPrice');
    expect(bookedExtrasForFeed({ ...value, addOnQuantityVersion: 1 }).extras?.[0]).toMatchObject({ quantity: 2, totalPrice: '25.00' });
  });

  it('does not guess the pricing method, price, or billed units when those facts are absent', () => {
    expect(bookedExtrasForFeed(withDetail({ price: undefined, perGuest: undefined }))).toEqual({ extras: [{
      id: 'upgrade', name: 'Saved private upgrade', quantity: null, selectedQuantity: 2,
    }] });
    expect(bookedExtrasForFeed(withDetail({ price: null, perGuest: null, quantity: 4 })).extras?.[0]).toEqual({
      id: 'upgrade', name: 'Saved private upgrade', quantity: 4, selectedQuantity: 2,
    });
  });

  it.each([
    [0, 'USD', '0.00', '0.00'],
    [0.1, 'usd', '0.10', '0.20'],
    [1.005, 'USD', '1.005', '2.01'],
    [12, 'JPY', '12', '24'],
    [1.234, 'KWD', '1.234', '2.468'],
  ])('preserves booked rate %s in %s without losing supported precision', (price, currency, unitPrice, totalPrice) => {
    expect(bookedExtrasForFeed({ ...withDetail({ price }), currency }).extras?.[0]).toMatchObject({ unitPrice, totalPrice, currency: currency.toUpperCase() });
  });

  it('normalizes display whitespace without truncating the purchased name', () => {
    expect(bookedExtrasForFeed(withDetail({ title: '  Saved\tprivate\nupgrade  ' })).extras?.[0].name).toBe('Saved private upgrade');
    expect(bookedExtrasForFeed(withDetail({ title: 'x'.repeat(201) }))).toEqual(ERROR);
  });

  it('refuses selected-only legacy IDs instead of inventing labels or reporting an empty purchase', () => {
    expect(bookedExtrasForFeed({ selectedAddOns: { 'addon-0': 1 } })).toEqual(ERROR);
    expect(bookedExtrasForFeed({ selectedAddOns: { 'A plausible name is still an unverified key': 1 } })).toEqual(ERROR);
    expect(bookedExtrasForFeed({ selectedAddOns: ['Saved name'] })).toEqual(ERROR);
    expect(bookedExtrasForFeed({ selectedAddOnDetails: { upgrade: detail() } })).toEqual(ERROR);
  });

  it.each([undefined, null, {}, [], { title: '' }, { title: 1 }])('refuses a selected extra without its valid saved title: %j', (saved) => {
    expect(bookedExtrasForFeed(snapshot({ selectedAddOnDetails: { upgrade: saved } }))).toEqual(ERROR);
  });

  it.each([-1, 1.5, 1000, NaN, Infinity, '2', true, null])('refuses malformed selected quantity %s', (quantity) => {
    expect(bookedExtrasForFeed(snapshot({ selectedAddOns: { upgrade: quantity } }))).toEqual(ERROR);
  });

  it.each([0, -1, 1.5, 1000, NaN, '2'])('refuses malformed recorded billed units %s', (quantity) => {
    expect(bookedExtrasForFeed(withDetail({ quantity }))).toEqual(ERROR);
  });

  it.each([-1, NaN, Infinity, '12.5', 1.2345, 1_000_000_000_000])('refuses a malformed saved unit price %s', (price) => {
    expect(bookedExtrasForFeed(withDetail({ price }))).toEqual(ERROR);
  });

  it('refuses prices without a usable currency, invalid pricing flags, and overflowing line totals', () => {
    for (const currency of [undefined, null, '', 'US', 'USDD', 123]) {
      expect(bookedExtrasForFeed(snapshot({ currency }))).toEqual(ERROR);
    }
    expect(bookedExtrasForFeed(withDetail({ perGuest: 'true' }))).toEqual(ERROR);
    expect(bookedExtrasForFeed(withDetail({ price: 999_999_999_999 }))).toEqual(ERROR);
  });

  it('bounds the whole purchased list without silently truncating it', () => {
    const selectedAddOns = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`extra-${i}`, 1]));
    const selectedAddOnDetails = Object.fromEntries(Object.keys(selectedAddOns).map((id) => [id, detail()]));
    expect(bookedExtrasForFeed(snapshot({ selectedAddOns, selectedAddOnDetails })).extras).toHaveLength(50);
    expect(bookedExtrasForFeed(snapshot({ selectedAddOns: { ...selectedAddOns, another: 1 }, selectedAddOnDetails }))).toEqual(ERROR);
  });
});
