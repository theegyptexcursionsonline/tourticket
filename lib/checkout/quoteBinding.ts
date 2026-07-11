import { createHash } from 'crypto';

function normalizedCart(cart: any[]) {
  return cart.map((item) => ({
    tourId: String(item?._id || item?.id || ''),
    date: String(item?.selectedDate || ''),
    time: String(item?.selectedTime || ''),
    adults: Number(item?.quantity || 0),
    children: Number(item?.childQuantity || 0),
    infants: Number(item?.infantQuantity || 0),
    option: String(item?.selectedBookingOption?.id || item?.selectedBookingOption?._id || ''),
    addons: item?.selectedAddOns || {},
  }));
}

export function buildQuoteBinding(input: {
  cart: any[];
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
