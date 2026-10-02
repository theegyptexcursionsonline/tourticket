type ReplayBooking = { tenantId?: string; guests?: number; selectedBookingOption?: { pricingKey?: string; id?: string }; tour?: unknown; dateString?: string; time?: string; paymentItemIndex?: number; status?: string; paymentStatus?: string; adultGuests?: number; childGuests?: number; infantGuests?: number };
type ReplayCart = { selectedBookingOption?: { pricingKey?: string; id?: string }; id?: unknown; _id?: unknown; selectedDate?: string; selectedTime?: string; quantity?: number; childQuantity?: number; infantQuantity?: number };
function matchesGuestCounts(booking: ReplayBooking, item: ReplayCart) {
  if (item.quantity === undefined) return (item.childQuantity === undefined || (booking.childGuests || 0) === item.childQuantity)
    && (item.infantQuantity === undefined || (booking.infantGuests || 0) === item.infantQuantity);
  return booking.adultGuests === undefined
    ? booking.guests === item.quantity + (item.childQuantity || 0) + (item.infantQuantity || 0)
    : booking.adultGuests === item.quantity && (booking.childGuests || 0) === (item.childQuantity || 0)
      && (booking.infantGuests || 0) === (item.infantQuantity || 0);
}
/** Used only after Stripe amount, customer, tenant and immutable quote binding are verified. */
export function isCompletePaidCheckoutReplay(bookings: ReplayBooking[], cart: ReplayCart[]) {
  return cart.length > 0 && bookings.length === cart.length && cart.every((item, index) => {
    const booking = bookings.find(row => (row.paymentItemIndex ?? (cart.length === 1 ? 0 : -1)) === index);
    return booking?.status === 'Confirmed' && booking.paymentStatus === 'paid'
      && String(booking.tour) === String(item._id || item.id)
      && booking.dateString === item.selectedDate && booking.time === item.selectedTime
      && matchesGuestCounts(booking, item);
  });
}

/** Account-wide Stripe identity permits historical default-tagged brand rows, never another named brand. */
export function matchesPaidCheckoutItems(bookings: ReplayBooking[], cart: ReplayCart[], tenantId: string) {
  const indices = new Set<number>();
  return bookings.length <= cart.length && bookings.every(booking => {
    const index = booking.paymentItemIndex ?? (cart.length === 1 ? 0 : -1);
    const item = cart[index];
    const storedTenant = booking.tenantId || 'default';
    if (!item || indices.has(index) || (storedTenant !== tenantId && storedTenant !== 'default')) return false;
    indices.add(index);
    const option = booking.selectedBookingOption;
    const requestedOption = item.selectedBookingOption;
    const optionComparable = (!option?.pricingKey && !option?.id)
      || Boolean((option.pricingKey && requestedOption?.pricingKey) || (option.id && requestedOption?.id));
    const optionMatches = optionComparable && (!option?.pricingKey || !requestedOption?.pricingKey || option.pricingKey === requestedOption.pricingKey)
      && (!option?.id || !requestedOption?.id || option.id === requestedOption.id);
    return String(booking.tour) === String(item._id || item.id)
      && booking.dateString === item.selectedDate && booking.time === item.selectedTime
      && matchesGuestCounts(booking, item) && optionMatches;
  });
}
