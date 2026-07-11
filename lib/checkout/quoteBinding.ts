import { createHash } from 'crypto';
interface QuoteCartItem {
  _id?: unknown;
  id?: unknown;
  selectedDate?: string;
  selectedTime?: string;
  quantity?: number;
  childQuantity?: number;
  infantQuantity?: number;
  selectedBookingOption?: { id?: string };
  selectedAddOns?: unknown;
}

function normalizedCart(cart: QuoteCartItem[]) {
  return cart.map((item) => ({
    tourId: String(item?._id || item?.id || ''),
    date: String(item?.selectedDate || ''),
    time: String(item?.selectedTime || ''),
    adults: Number(item?.quantity || 0),
    children: Number(item?.childQuantity || 0),
    infants: Number(item?.infantQuantity || 0),
    option: String(item?.selectedBookingOption?.id || ''),
    addons: item?.selectedAddOns || {},
  }));
}

export function buildQuoteBinding(input: {
  cart: QuoteCartItem[];
  customerEmail: string;
  currency: string;
  amountMinor: number;
  discountCode?: string | null;
}) {
  const canonical = JSON.stringify({
    cart: normalizedCart(input.cart),
    customerEmail: input.customerEmail.trim().toLowerCase(),
    currency: input.currency.toUpperCase(),
    amountMinor: input.amountMinor,
    discountCode: String(input.discountCode || '').trim().toUpperCase(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}
