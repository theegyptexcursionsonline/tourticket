import { storedAddOnUnits } from '@/lib/checkout/addOnPricing';

/**
 * Booking detail pages and receipts re-render what the server billed. New
 * bookings carry the billed unit count on the add-on detail; bookings made
 * before that was recorded were billed per paying guest and must keep
 * rendering that way — a historical booking is never re-priced.
 */
describe('storedAddOnUnits', () => {
  it('renders the recorded per-person units on a new booking', () => {
    expect(storedAddOnUnits({ perGuest: true, quantity: 2 }, 2, 4, 0)).toBe(2);
  });

  it('trusts the immutable server-billed quantity instead of re-pricing it from later guest fields', () => {
    expect(storedAddOnUnits({ perGuest: true, quantity: 2 }, 2, 1, 0)).toBe(2);
    expect(storedAddOnUnits({ perGuest: true, quantity: 3 }, 3, 0, 0)).toBe(3);
  });

  it('falls back to the paying party for a legacy per-person line without a recorded quantity', () => {
    expect(storedAddOnUnits({ perGuest: true }, 1, 3, 1)).toBe(4);
    expect(storedAddOnUnits({ perGuest: true, quantity: undefined }, 1, 2, 0)).toBe(2);
  });

  it('uses the stored quantity for per-unit add-ons', () => {
    expect(storedAddOnUnits({ perGuest: false }, 2, 4, 0)).toBe(2);
    expect(storedAddOnUnits({ perGuest: false, quantity: 7 }, 2, 4, 0)).toBe(2);
  });

  it('treats a missing detail or malformed quantity as zero units', () => {
    expect(storedAddOnUnits(undefined, 2, 4, 0)).toBe(2);
    expect(storedAddOnUnits({ perGuest: false }, 'x', 4, 0)).toBe(0);
  });
});
