import {
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

  it('includes infants in per-guest add-on multipliers and respects quantities', () => {
    expect(checkoutAddOnsTotal(item)).toBe(40);
    expect(checkoutItemSubtotal(item)).toBe(305);
  });

  it('rounds only at item/cart currency boundaries', () => {
    expect(checkoutCartSubtotal([
      { quantity: 1, guestPrices: { adult: 10.005, child: 0, infant: 0 } },
      { quantity: 1, guestPrices: { adult: 10.005, child: 0, infant: 0 } },
    ])).toBe(20.02);
  });

  it('reconstructs the same infant and add-on total for webhook recovery', () => {
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
    })).toBe(305);
  });
});
