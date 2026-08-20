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

describe('unit-priced items (per couple/family/group, client sheet 2026-08-20)', () => {
  const unitItem = (participants: { a: number; c?: number; n?: number }, unitSize: number, unitPrice: number) => ({
    quantity: participants.a,
    childQuantity: participants.c || 0,
    infantQuantity: participants.n || 0,
    // Deliberately wrong per-guest prices: unit pricing must ignore them.
    guestPrices: { adult: 9999, child: 9999, infant: 9999 },
    unitPricing: { unitSize, unitPrice },
  });

  it('charges whole units: 4 participants on a $200 couple option are 2 couples = $400', () => {
    expect(checkoutItemSubtotal(unitItem({ a: 2, c: 2 }, 2, 200))).toBe(400);
  });

  it('rounds odd counts UP: 3 participants on a couple option charge 2 couples', () => {
    expect(checkoutItemSubtotal(unitItem({ a: 2, c: 1 }, 2, 200))).toBe(400);
  });

  it('family and group step-ups match the client examples (5→$800, 6→$1000)', () => {
    expect(checkoutItemSubtotal(unitItem({ a: 4, c: 1 }, 4, 400))).toBe(800);
    expect(checkoutItemSubtotal(unitItem({ a: 5, c: 1 }, 5, 500))).toBe(1000);
  });

  it('infants occupy capacity in unit pricing', () => {
    expect(checkoutItemSubtotal(unitItem({ a: 2, n: 1 }, 2, 200))).toBe(400);
  });

  it('a legacy whole-booking group (unit size 0) charges exactly one unit', () => {
    expect(checkoutItemSubtotal(unitItem({ a: 3, c: 1 }, 0, 323.18))).toBe(323.18);
  });

  it('add-ons still charge on top of the unit price', () => {
    const item = {
      ...unitItem({ a: 2 }, 2, 200),
      selectedAddOns: { lunch: 1 },
      selectedAddOnDetails: { lunch: { price: 25 } },
    };
    expect(checkoutItemSubtotal(item)).toBe(225);
  });

  it('recovery records carry the unit contract through us/up', () => {
    expect(recoveryCartItemSubtotal({ a: 2, c: 1, bp: 200, gp: { adult: 200 }, us: 2, up: 200 })).toBe(400);
    expect(recoveryCartItemSubtotal({ a: 3, c: 1, bp: 323.18, gp: { adult: 323.18 }, us: 0, up: 323.18 })).toBe(323.18);
  });

  it('a recovery record without unit fields keeps per-guest pricing', () => {
    expect(recoveryCartItemSubtotal({ a: 2, bp: 100, gp: { adult: 100, child: 50, infant: 0 } })).toBe(200);
  });
});
