/**
 * Re-rendering a stored booking: receipts, the customer's booking page and
 * the admin booking page.
 *
 * Each of these used to rebuild the price itself — `option.price x
 * adultGuests`, child at half — which overstated every per-couple/family/
 * group booking and ignored the unit contract the checkout actually charged.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  bookingBreakdown,
  bookingPricedItem,
  breakdownRowLabel,
  type StoredBookingPricing,
} from '@/lib/checkout/bookingBreakdown';
import { checkoutItemSubtotal } from '@/lib/checkout/cartTotals';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const groupBooking: StoredBookingPricing = {
  adultGuests: 5,
  childGuests: 0,
  infantGuests: 0,
  selectedBookingOption: { price: 650, type: 'Per Group' },
  priceSnapshot: {
    guestPrices: { adult: 650, child: 325, infant: 0 },
    unitPricing: { unitSize: 5, unitPrice: 650 },
  },
};

describe('a stored per-group booking renders as the group it was sold as', () => {
  it('shows one group line, not five adult fares', () => {
    const { rows, subtotal, tourSubtotal } = bookingBreakdown(groupBooking);

    expect(rows).toEqual([
      { kind: 'units', count: 1, unitPrice: 650, amount: 650, label: '1 group' },
    ]);
    expect(rows.map((row) => row.amount)).not.toContain(3250);
    expect(tourSubtotal).toBe(650);
    expect(subtotal).toBe(650);
  });

  it('derives fee and tax from the corrected subtotal', () => {
    const { subtotal, serviceFee, tax } = bookingBreakdown(groupBooking);
    expect(serviceFee).toBe(19.5);
    expect(tax).toBe(32.5);
    // What the customer was charged: 650 + 19.50 + 32.50 = 702.
    expect(Math.round((subtotal + serviceFee + tax) * 100) / 100).toBe(702);
  });

  it('words the line for a customer', () => {
    const [row] = bookingBreakdown(groupBooking).rows;
    expect(breakdownRowLabel(row)).toBe('1 group x $650.00');
  });

  it('falls back to a neutral unit noun when an older booking stored no option type', () => {
    const legacy = { ...groupBooking, selectedBookingOption: { price: 650 } };
    const [row] = bookingBreakdown(legacy).rows;
    expect(row.amount).toBe(650);
    expect(breakdownRowLabel(row)).toBe('1 unit x $650.00');
  });
});

describe('per-person bookings keep the guest lines they always had', () => {
  const perPerson: StoredBookingPricing = {
    adultGuests: 2,
    childGuests: 1,
    infantGuests: 1,
    selectedBookingOption: { price: 100, type: 'Per Person' },
    priceSnapshot: { guestPrices: { adult: 100, child: 55, infant: 10 }, unitPricing: null },
  };

  it('prices each band from the snapshot, not from half the adult fare', () => {
    expect(bookingBreakdown(perPerson).rows).toEqual([
      { kind: 'adults', count: 2, unitPrice: 100, amount: 200 },
      { kind: 'children', count: 1, unitPrice: 55, amount: 55 },
      { kind: 'infants', count: 1, unitPrice: 10, amount: 10 },
    ]);
    expect(bookingBreakdown(perPerson).subtotal).toBe(265);
  });

  it('falls back to the stored option price when a booking predates price snapshots', () => {
    const legacy: StoredBookingPricing = {
      adultGuests: 2,
      childGuests: 1,
      selectedBookingOption: { price: 100 },
    };
    expect(bookingBreakdown(legacy).rows).toEqual([
      { kind: 'adults', count: 2, unitPrice: 100, amount: 200 },
      { kind: 'children', count: 1, unitPrice: 50, amount: 50 },
    ]);
  });

  it('bills stored add-ons for the units the server recorded', () => {
    const withAddOns: StoredBookingPricing = {
      ...perPerson,
      addOnQuantityVersion: 1,
      selectedAddOns: { lunch: 2 },
      selectedAddOnDetails: { lunch: { price: 25, perGuest: true, quantity: 2 } },
    };
    const { rows, addOnsTotal, subtotal } = bookingBreakdown(withAddOns);
    expect(addOnsTotal).toBe(50);
    expect(rows.reduce((total, row) => total + row.amount, 0)).toBe(subtotal);
  });
});

describe('the stored booking adapter feeds the one pricing authority', () => {
  it('produces a cart line the shared subtotal can price directly', () => {
    expect(checkoutItemSubtotal(bookingPricedItem(groupBooking))).toBe(650);
  });
});

describe('no booking surface re-derives a per-guest price any more', () => {
  const surfaces = [
    'app/[locale]/user/bookings/[id]/page.tsx',
    'app/admin/bookings/[id]/page.tsx',
  ];

  it.each(surfaces)('%s builds its breakdown from the shared authority', (path) => {
    const file = source(path);
    expect(file).toContain("from '@/lib/checkout/bookingBreakdown'");
    expect(file).toContain('bookingBreakdown(booking)');
    // The exact derivations that produced the defect.
    expect(file).not.toContain('basePrice * (booking.adultGuests || 1)');
    expect(file).not.toContain('(basePrice / 2) * (booking.childGuests || 0)');
  });

  it('the receipt hands the unit contract to the generator', () => {
    expect(source('app/api/checkout/receipt/route.ts'))
      .toContain('unitPricing: booking.priceSnapshot?.unitPricing');
  });

  it('the receipt generator prices through the shared authority', () => {
    const receipt = source('lib/utils/generateReceiptPdf.ts');
    expect(receipt).toContain("from '@/lib/checkout/cartTotals'");
    expect(receipt).toContain('checkoutItemSubtotal({');
    expect(receipt).not.toContain('Number(item.guestPrices?.adult ?? basePrice) * (item.quantity || 1)');
  });

  it('the mobile quote publishes rows instead of leaving consumers to multiply', () => {
    const quote = source('lib/checkout/mobileCommerce.ts');
    expect(quote).toContain('assertBreakdownReconciles(breakdown, subtotal)');
    expect(quote).toContain('breakdown,');
    expect(quote).toContain('unitPricing: item.unitPricing ?? null,');
  });

  it('nothing reaches Stripe without both invariants holding', () => {
    const preparation = source('lib/checkout/webCheckoutPreparation.ts');
    expect(preparation).toContain('assertBreakdownReconciles(checkoutItemBreakdown(item), checkoutItemSubtotal(item))');
    expect(preparation).toContain('assertOrderTotalReconciles({ subtotal, serviceFee, tax, discount, total })');
  });
});
