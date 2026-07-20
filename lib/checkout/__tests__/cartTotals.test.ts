import {
  checkoutAddOnGuestCount,
  checkoutAddOnsTotal,
  checkoutCartSubtotal,
  checkoutItemSubtotal,
  recoveryCartItemSubtotal,
} from '@/lib/checkout/cartTotals';

const item = {
  quantity: 2,
  childQuantity: 1,
  infantQuantity: 1,
  guestPrices: { adult: 100, child: 55, infant: 10 },
  selectedAddOns: { meal: 1, photo: 2 },
  selectedAddOnDetails: {
    meal: { price: 5, perGuest: true },
    photo: { price: 10, perGuest: false },
  },
};

describe('authoritative checkout totals', () => {
  it('charges explicit adult, child, and infant prices', () => {
    expect(checkoutItemSubtotal({ ...item, selectedAddOns: {} })).toBe(265);
  });

  it('counts only paying guests (adults + children) for per-person add-ons', () => {
    expect(checkoutAddOnGuestCount(item)).toBe(3);
  });

  it('charges per-person add-ons per paying guest and per-unit add-ons per quantity', () => {
    // meal: 5 × 3 paying guests = 15; photo: 10 × 2 units = 20
    expect(checkoutAddOnsTotal(item)).toBe(35);
    expect(checkoutItemSubtotal(item)).toBe(300);
  });

  it('never multiplies a per-person add-on by its stored quantity (legacy carts stored the guest count there)', () => {
    const legacyItem = {
      ...item,
      // Old clients wrote quantity = guest count for per-guest add-ons.
      selectedAddOns: { meal: 3, photo: 2 },
    };
    // Still 5 × 3 guests = 15, not 5 × 3 × 3.
    expect(checkoutAddOnsTotal(legacyItem)).toBe(35);
  });

  it('rounds only at item/cart currency boundaries', () => {
    expect(checkoutCartSubtotal([
      { quantity: 1, guestPrices: { adult: 10.005, child: 0, infant: 0 } },
      { quantity: 1, guestPrices: { adult: 10.005, child: 0, infant: 0 } },
    ])).toBe(20.02);
  });

  it('reconstructs the same add-on total for webhook recovery', () => {
    expect(recoveryCartItemSubtotal({
      a: 2,
      c: 1,
      n: 1,
      bp: 100,
      gp: { adult: 100, child: 55, infant: 10 },
      ao: [
        { id: 'meal', q: 1, p: 5, pg: true },
        { id: 'photo', q: 2, p: 10, pg: false },
      ],
    })).toBe(300);
  });
});
