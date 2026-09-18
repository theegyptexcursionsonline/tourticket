/**
 * Re-render a stored booking's price the way it was actually charged.
 *
 * Booking detail pages and receipts used to rebuild the breakdown themselves
 * — `option.price x adultGuests`, child at half — which is wrong for every
 * per-couple/family/group option: those charge whole units, so multiplying
 * the unit price by the adult count overstated the line (a $650 group at 5
 * participants rendered as $3,250 against a $650 subtotal). They now read the
 * same rows checkout priced, so a booking can only ever be shown the way it
 * was sold.
 */
import {
  checkoutAddOnsTotal,
  checkoutItemBreakdown,
  checkoutItemSubtotal,
  checkoutTourSubtotal,
  roundMoney,
  type CheckoutPricedItem,
  type PriceBreakdownRow,
} from '@/lib/checkout/cartTotals';

export interface StoredBookingPricing {
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  selectedBookingOption?: { price?: number; type?: string | null } | null;
  /** Written at checkout. Older bookings have none and fall back to the option price. */
  priceSnapshot?: {
    guestPrices?: { adult?: number; child?: number; infant?: number } | null;
    unitPricing?: { unitSize: number; unitPrice: number } | null;
  } | null;
  addOnQuantityVersion?: number;
  selectedAddOns?: { [addOnId: string]: number } | null;
  selectedAddOnDetails?: {
    [addOnId: string]: { price: number; perGuest?: boolean; quantity?: number };
  } | null;
}

const guestPrices = (booking: StoredBookingPricing) => {
  const snapshot = booking.priceSnapshot?.guestPrices;
  if (!snapshot || !Number.isFinite(Number(snapshot.adult))) return undefined;
  const adult = Number(snapshot.adult);
  return {
    adult,
    child: Number.isFinite(Number(snapshot.child)) ? Number(snapshot.child) : adult / 2,
    infant: Number.isFinite(Number(snapshot.infant)) ? Number(snapshot.infant) : 0,
  };
};

/** A stored booking expressed as the priced cart line checkout would have seen. */
export function bookingPricedItem(booking: StoredBookingPricing): CheckoutPricedItem {
  return {
    quantity: booking.adultGuests || 0,
    childQuantity: booking.childGuests || 0,
    infantQuantity: booking.infantGuests || 0,
    guestPrices: guestPrices(booking),
    selectedBookingOption: booking.selectedBookingOption || undefined,
    unitPricing: booking.priceSnapshot?.unitPricing || null,
    addOnQuantityVersion: booking.addOnQuantityVersion,
    selectedAddOns: booking.selectedAddOns || undefined,
    selectedAddOnDetails: booking.selectedAddOnDetails || undefined,
  };
}

export interface StoredBookingBreakdown {
  /** Priced lines that add up to `subtotal`. Never re-derive these. */
  rows: PriceBreakdownRow[];
  tourSubtotal: number;
  addOnsTotal: number;
  subtotal: number;
  serviceFee: number;
  tax: number;
}

/**
 * The lines, subtotal, fee and tax for one stored booking. The caller still
 * decides which total to trust — the charged `totalPrice` on the record is
 * the money that moved, and this never overrides it.
 */
export function bookingBreakdown(booking: StoredBookingPricing): StoredBookingBreakdown {
  const item = bookingPricedItem(booking);
  const subtotal = checkoutItemSubtotal(item);
  return {
    rows: checkoutItemBreakdown(item),
    tourSubtotal: checkoutTourSubtotal(item),
    addOnsTotal: checkoutAddOnsTotal(item),
    subtotal,
    serviceFee: roundMoney(subtotal * 0.03),
    tax: roundMoney(subtotal * 0.05),
  };
}

/** The customer-facing wording for one breakdown line. */
export function breakdownRowLabel(row: PriceBreakdownRow, currencySymbol = '$'): string {
  switch (row.kind) {
    case 'units':
      // `label` carries the authored noun when the option type is known
      // ("1 group"); stored bookings predating that fall back to "1 unit".
      return `${row.label || `${row.count} unit${row.count === 1 ? '' : 's'}`} x ${currencySymbol}${row.unitPrice.toFixed(2)}`;
    case 'adults':
      return `${row.count} x Adult${row.count > 1 ? 's' : ''} (${currencySymbol}${row.unitPrice.toFixed(2)})`;
    case 'children':
      return `${row.count} x Child${row.count > 1 ? 'ren' : ''} (${currencySymbol}${row.unitPrice.toFixed(2)})`;
    case 'infants':
      return `${row.count} x Infant${row.count > 1 ? 's' : ''}`;
    default:
      return 'Add-ons';
  }
}
