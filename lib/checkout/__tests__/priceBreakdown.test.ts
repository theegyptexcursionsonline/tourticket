/**
 * The breakdown invariant.
 *
 * Every priced line an item publishes must add up to that item's subtotal,
 * and the order total must be that subtotal plus fees and tax minus the
 * discount. Consumers (the mobile app, web checkout, receipts, admin) render
 * these rows; none of them may re-derive a breakdown by multiplying a guest
 * price by a guest count, because that is wrong for every unit-priced option.
 */
import {
  assertBreakdownReconciles,
  assertOrderTotalReconciles,
  checkoutItemBreakdown,
  checkoutItemSubtotal,
  checkoutTourSubtotal,
  checkoutUnitCount,
  OrderTotalMismatchError,
  PriceBreakdownMismatchError,
  roundMoney,
  type CheckoutPricedItem,
  type PriceBreakdownRow,
} from '@/lib/checkout/cartTotals';
import {
  capacityAvailability,
  capacityBlockedMessage,
  unitPricingForOption,
} from '@/lib/bookings/unitPricing';
import { effectiveSlotGuestPrices } from '@/lib/revenue/guestPrices';

const rowSum = (rows: PriceBreakdownRow[]) => roundMoney(rows.reduce((total, row) => total + row.amount, 0));
const row = (rows: PriceBreakdownRow[], kind: PriceBreakdownRow['kind']) => rows.find((entry) => entry.kind === kind);

/**
 * Build the cart line exactly as `secureCartPricing` does: capacity and unit
 * rules from the stored option, guest prices derived from the option price.
 */
const lineFor = (
  option: { type: string; price: number; minCapacity?: number; maxCapacity?: number },
  guests: { adults: number; children?: number; infants?: number },
  extras: Partial<CheckoutPricedItem> = {},
): CheckoutPricedItem => {
  const unit = unitPricingForOption(option, option.price);
  return {
    quantity: guests.adults,
    childQuantity: guests.children || 0,
    infantQuantity: guests.infants || 0,
    guestPrices: effectiveSlotGuestPrices({ adult: option.price }),
    selectedBookingOption: { price: option.price, type: option.type },
    unitPricing: unit ? { unitSize: unit.unitSize, unitPrice: unit.unitPrice } : null,
    ...extras,
  };
};

describe('regression: the reported per-group quote (Per Group $650, minCapacity 5, 5 participants)', () => {
  const option = { type: 'Per Group', price: 650, minCapacity: 5 };

  it('never multiplies the group price by the number of adults', () => {
    const rows = checkoutItemBreakdown(lineFor(option, { adults: 5 }));

    // The exact figure the defect produced. It must not appear anywhere.
    expect(rows.map((entry) => entry.amount)).not.toContain(3250);
    expect(row(rows, 'adults')).toBeUndefined();
    expect(row(rows, 'children')).toBeUndefined();
  });

  it('expresses the charge as one group line that equals the subtotal and the total', () => {
    const line = lineFor(option, { adults: 5 });
    const rows = checkoutItemBreakdown(line);
    const subtotal = checkoutItemSubtotal(line);

    expect(rows).toEqual([
      { kind: 'units', count: 1, unitPrice: 650, amount: 650, label: '1 group' },
    ]);
    expect(rowSum(rows)).toBe(subtotal);
    expect(subtotal).toBe(650);
    // No fees or tax on this path, so the total is the subtotal.
    expect(() => assertOrderTotalReconciles({ subtotal, total: 650 })).not.toThrow();
  });

  it('leaves the per-guest rate table visible but never charges from it', () => {
    const line = lineFor(option, { adults: 5 });
    // The rate table is still $650/$325/$0 — meaningless for a group option,
    // which is exactly why the quote must publish rows instead.
    expect(line.guestPrices).toEqual({ adult: 650, child: 325, infant: 0 });
    expect(checkoutTourSubtotal(line)).toBe(650);
  });
});

describe('per-group options at, below and above their minimum', () => {
  const option = { type: 'Per Group', price: 650, minCapacity: 5 };

  it('is blocked below the minimum, before any charge can be derived', () => {
    const availability = capacityAvailability(option, 4);
    expect(availability).toEqual({ available: false, reason: 'below_minimum', limit: 5 });
    expect(capacityBlockedMessage(availability)).toBe('Requires at least 5 participants');
  });

  it('charges exactly one group at the minimum', () => {
    const line = lineFor(option, { adults: 5 });
    expect(checkoutUnitCount(line)).toBe(1);
    expect(checkoutItemBreakdown(line)).toEqual([
      { kind: 'units', count: 1, unitPrice: 650, amount: 650, label: '1 group' },
    ]);
  });

  it('steps up to whole groups above the minimum and still reconciles', () => {
    const line = lineFor(option, { adults: 5, children: 1 });
    const rows = checkoutItemBreakdown(line);
    expect(rows).toEqual([
      { kind: 'units', count: 2, unitPrice: 650, amount: 1300, label: '2 groups' },
    ]);
    expect(rowSum(rows)).toBe(checkoutItemSubtotal(line));
  });

  it('refuses a party past an authored maximum', () => {
    const capped = { type: 'Per Group', price: 650, minCapacity: 5, maxCapacity: 8 };
    expect(capacityAvailability(capped, 9)).toEqual({ available: false, reason: 'above_maximum', limit: 8 });
  });

  it('charges a legacy group with no authored capacity as exactly one group', () => {
    const legacy = lineFor({ type: 'Per Group', price: 650 }, { adults: 9, children: 3 });
    expect(checkoutItemBreakdown(legacy)).toEqual([
      { kind: 'units', count: 1, unitPrice: 650, amount: 650, label: '1 group' },
    ]);
  });
});

describe('every pricing type produces rows that add up to its subtotal', () => {
  const cases: Array<{
    name: string;
    option: { type: string; price: number; minCapacity?: number };
    guests: { adults: number; children?: number; infants?: number };
    expected: PriceBreakdownRow[];
  }> = [
    {
      name: 'Per Person — one row per guest band, each rate times its count',
      option: { type: 'Per Person', price: 100 },
      guests: { adults: 2, children: 1, infants: 1 },
      expected: [
        { kind: 'adults', count: 2, unitPrice: 100, amount: 200 },
        { kind: 'children', count: 1, unitPrice: 50, amount: 50 },
        { kind: 'infants', count: 1, unitPrice: 0, amount: 0 },
      ],
    },
    {
      name: 'Per Couple — 3 participants are 2 couples',
      option: { type: 'Per Couple', price: 200, minCapacity: 2 },
      guests: { adults: 2, children: 1 },
      expected: [{ kind: 'units', count: 2, unitPrice: 200, amount: 400, label: '2 couples' }],
    },
    {
      name: 'Per Family — 4 participants are 1 family',
      option: { type: 'Per Family', price: 400, minCapacity: 4 },
      guests: { adults: 2, children: 1, infants: 1 },
      expected: [{ kind: 'units', count: 1, unitPrice: 400, amount: 400, label: '1 family' }],
    },
    {
      name: 'Per Group — 5 participants are 1 group',
      option: { type: 'Per Group', price: 650, minCapacity: 5 },
      guests: { adults: 5 },
      expected: [{ kind: 'units', count: 1, unitPrice: 650, amount: 650, label: '1 group' }],
    },
  ];

  it.each(cases)('$name', ({ option, guests, expected }) => {
    const line = lineFor(option, guests);
    const rows = checkoutItemBreakdown(line);
    expect(rows).toEqual(expected);
    expect(rowSum(rows)).toBe(checkoutItemSubtotal(line));
  });

  it('prices a tour sold without an option (the standard per-person path)', () => {
    const line: CheckoutPricedItem = {
      quantity: 2,
      childQuantity: 1,
      infantQuantity: 0,
      guestPrices: { adult: 80, child: 40, infant: 0 },
      unitPricing: null,
    };
    expect(checkoutItemBreakdown(line)).toEqual([
      { kind: 'adults', count: 2, unitPrice: 80, amount: 160 },
      { kind: 'children', count: 1, unitPrice: 40, amount: 40 },
    ]);
    expect(checkoutItemSubtotal(line)).toBe(200);
  });

  it('honours authored child and infant bands rather than assuming half price', () => {
    const line: CheckoutPricedItem = {
      quantity: 1,
      childQuantity: 2,
      infantQuantity: 1,
      guestPrices: { adult: 120, child: 75, infant: 15 },
      unitPricing: null,
    };
    const rows = checkoutItemBreakdown(line);
    expect(rows).toEqual([
      { kind: 'adults', count: 1, unitPrice: 120, amount: 120 },
      { kind: 'children', count: 2, unitPrice: 75, amount: 150 },
      { kind: 'infants', count: 1, unitPrice: 15, amount: 15 },
    ]);
    expect(rowSum(rows)).toBe(checkoutItemSubtotal(line));
  });

  it('omits a guest band nobody booked but keeps a free one that was', () => {
    const rows = checkoutItemBreakdown({
      quantity: 2,
      childQuantity: 0,
      infantQuantity: 1,
      guestPrices: { adult: 100, child: 50, infant: 0 },
      unitPricing: null,
    });
    expect(rows.map((entry) => entry.kind)).toEqual(['adults', 'infants']);
    expect(row(rows, 'infants')).toMatchObject({ count: 1, amount: 0 });
  });
});

describe('add-ons, fees, tax and discounts', () => {
  const addOns = {
    addOnQuantityVersion: 1,
    selectedAddOns: { lunch: 2, transfer: 1 },
    selectedAddOnDetails: {
      lunch: { price: 25, perGuest: true },
      transfer: { price: 40, perGuest: false },
    },
  };

  it('adds one aggregated add-on row on top of a unit-priced tour', () => {
    const line = lineFor({ type: 'Per Group', price: 650, minCapacity: 5 }, { adults: 5 }, addOns);
    const rows = checkoutItemBreakdown(line);
    expect(rows).toEqual([
      { kind: 'units', count: 1, unitPrice: 650, amount: 650, label: '1 group' },
      { kind: 'addOns', count: 0, unitPrice: 0, amount: 90 },
    ]);
    expect(rowSum(rows)).toBe(checkoutItemSubtotal(line));
    expect(checkoutItemSubtotal(line)).toBe(740);
  });

  it('adds the same row on top of a per-person tour', () => {
    const line = lineFor({ type: 'Per Person', price: 100 }, { adults: 2, children: 1 }, addOns);
    const rows = checkoutItemBreakdown(line);
    expect(row(rows, 'addOns')).toEqual({ kind: 'addOns', count: 0, unitPrice: 0, amount: 90 });
    expect(rowSum(rows)).toBe(checkoutItemSubtotal(line));
  });

  it('caps a per-person add-on at the paying party on a unit-priced tour too', () => {
    // 2 adults + 1 child = 3 paying participants; the infant never counts.
    const line = lineFor(
      { type: 'Per Family', price: 400, minCapacity: 4 },
      { adults: 2, children: 1, infants: 1 },
      { ...addOns, selectedAddOns: { lunch: 9 } },
    );
    expect(row(checkoutItemBreakdown(line), 'addOns')).toMatchObject({ amount: 75 });
  });

  it('reconciles a total built from the subtotal, a 3% fee, 5% tax and a discount', () => {
    const line = lineFor({ type: 'Per Group', price: 650, minCapacity: 5 }, { adults: 5 }, addOns);
    const subtotal = checkoutItemSubtotal(line);
    const serviceFee = roundMoney(subtotal * 0.03);
    const tax = roundMoney(subtotal * 0.05);
    const discount = 50;
    const total = roundMoney(Math.max(0, subtotal + serviceFee + tax - discount));

    assertBreakdownReconciles(checkoutItemBreakdown(line), subtotal);
    expect(() => assertOrderTotalReconciles({ subtotal, serviceFee, tax, discount, total })).not.toThrow();
    // A discount reduces the order, never the priced lines.
    expect(rowSum(checkoutItemBreakdown(line))).toBe(subtotal);
  });

  it('floors a discount larger than the order at zero rather than refunding', () => {
    expect(() => assertOrderTotalReconciles({
      subtotal: 100, serviceFee: 3, tax: 5, discount: 500, total: 0,
    })).not.toThrow();
  });
});

describe('the invariant is enforced, not assumed', () => {
  it('throws when breakdown rows do not add up to the subtotal', () => {
    const rows: PriceBreakdownRow[] = [{ kind: 'adults', count: 5, unitPrice: 650, amount: 3250 }];
    expect(() => assertBreakdownReconciles(rows, 650)).toThrow(PriceBreakdownMismatchError);
    expect(() => assertBreakdownReconciles(rows, 650)).toThrow(/3250/);
  });

  it('throws when the total does not reconcile to its own subtotal, fees and discount', () => {
    expect(() => assertOrderTotalReconciles({
      subtotal: 650, serviceFee: 19.5, tax: 32.5, discount: 0, total: 650,
    })).toThrow(OrderTotalMismatchError);
  });

  it('accepts a total that reconciles exactly', () => {
    expect(() => assertOrderTotalReconciles({
      subtotal: 650, serviceFee: 19.5, tax: 32.5, discount: 0, total: 702,
    })).not.toThrow();
  });

  it('keeps sub-cent rounding inside the rows so they still add up', () => {
    const line: CheckoutPricedItem = {
      quantity: 3,
      childQuantity: 3,
      infantQuantity: 0,
      guestPrices: { adult: 10.005, child: 3.335, infant: 0 },
      unitPricing: null,
    };
    const rows = checkoutItemBreakdown(line);
    expect(rowSum(rows)).toBe(checkoutItemSubtotal(line));
  });

  it('every breakdown this suite can build reconciles by construction', () => {
    const options = [
      { type: 'Per Person', price: 100 },
      { type: 'Per Couple', price: 200, minCapacity: 2 },
      { type: 'Per Family', price: 400, minCapacity: 4 },
      { type: 'Per Group', price: 650, minCapacity: 5 },
      { type: 'Per Group', price: 650 },
    ];
    for (const option of options) {
      for (let adults = 1; adults <= 6; adults += 1) {
        for (const children of [0, 1, 2]) {
          for (const infants of [0, 1]) {
            const line = lineFor(option, { adults, children, infants }, {
              addOnQuantityVersion: 1,
              selectedAddOns: { lunch: 1 },
              selectedAddOnDetails: { lunch: { price: 25, perGuest: true } },
            });
            assertBreakdownReconciles(checkoutItemBreakdown(line), checkoutItemSubtotal(line));
          }
        }
      }
    }
  });
});
