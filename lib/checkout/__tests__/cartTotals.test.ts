import {
  checkoutAddOnGuestCount,
  checkoutAddOnsTotal,
  checkoutCartSubtotal,
  checkoutItemSubtotal,
  recoveryCartItemSubtotal,
} from '@/lib/checkout/cartTotals';

const item = {
  addOnQuantityVersion: 1,
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

  // Client sheet (EEO 24 Aug): a per-person add-on is billed for the units the
  // guest chose, not multiplied by the party size. This test previously pinned
  // "5 × 3 paying guests = 15" for a stored quantity of 1; it now pins the
  // chosen unit count.
  it('charges per-person add-ons per chosen unit and per-unit add-ons per quantity', () => {
    // meal: 5 × 1 chosen unit = 5; photo: 10 × 2 units = 20
    expect(checkoutAddOnsTotal(item)).toBe(25);
    expect(checkoutItemSubtotal(item)).toBe(290);
    // meal: 5 × 2 chosen units = 10
    expect(checkoutAddOnsTotal({ ...item, selectedAddOns: { meal: 2, photo: 2 } })).toBe(30);
  });

  it('caps a per-person add-on at one unit per paying participant (infants excluded)', () => {
    // 2 adults + 1 child = 3 paying guests; the infant never counts.
    expect(checkoutAddOnsTotal({ ...item, selectedAddOns: { meal: 9 } })).toBe(15);
    // Legacy carts stored the guest count as the quantity — same cap, same charge.
    expect(checkoutAddOnsTotal({ ...item, selectedAddOns: { meal: 3 } })).toBe(15);
  });

  it('preserves the whole paying-party charge for an unversioned cart toggle', () => {
    expect(checkoutAddOnsTotal({
      ...item,
      addOnQuantityVersion: undefined,
      selectedAddOns: { meal: 1 },
    })).toBe(15);
  });

  it('rounds only at item/cart currency boundaries', () => {
    expect(checkoutCartSubtotal([
      { quantity: 1, guestPrices: { adult: 10.005, child: 0, infant: 0 } },
      { quantity: 1, guestPrices: { adult: 10.005, child: 0, infant: 0 } },
    ])).toBe(20.02);
  });

  // Recovery replays the billed unit count (`q`): meal 5 × 1 chosen unit = 5,
  // photo 10 × 2 = 20, tour 265 → 290 (was 300 under the per-guest multiply).
  it('reconstructs the same add-on total for webhook recovery', () => {
    expect(recoveryCartItemSubtotal({
      aqv: 1,
      a: 2,
      c: 1,
      n: 1,
      bp: 100,
      gp: { adult: 100, child: 55, infant: 10 },
      ao: [
        { id: 'meal', q: 1, p: 5, pg: true },
        { id: 'photo', q: 2, p: 10, pg: false },
      ],
    })).toBe(290);
  });

  it('preserves the pre-release whole-party add-on charge for an in-flight Stripe quote without aqv', () => {
    expect(recoveryCartItemSubtotal({
      a: 2,
      c: 1,
      n: 1,
      bp: 100,
      gp: { adult: 100, child: 50, infant: 0 },
      ao: [{ id: 'meal', q: 1, p: 5, pg: true }],
    })).toBe(265);
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
