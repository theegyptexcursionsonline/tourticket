import { isCompletePaidCheckoutReplay, matchesPaidCheckoutItems } from '../confirmedCheckoutReplay';
const cart = [{ _id: 'tour-owned', selectedDate: '2026-10-02', selectedTime: '08:00', quantity: 1,
  childQuantity: 0, infantQuantity: 0, selectedBookingOption: { pricingKey: 'option-owned' } }];
const legacy = { tenantId: 'default', tour: 'tour-owned', dateString: '2026-10-02', time: '08:00',
  adultGuests: 1, status: 'Confirmed', paymentStatus: 'paid' };
it('admits and completes a historical single default-tagged named-brand row with no stored item index', () => {
  expect(matchesPaidCheckoutItems([legacy], cart, 'named-brand')).toBe(true);
  expect(isCompletePaidCheckoutReplay([legacy], cart)).toBe(true);
});
it('never guesses missing indices for a multi-item payment', () => {
  expect(matchesPaidCheckoutItems([legacy], [...cart, ...cart], 'named-brand')).toBe(false);
  expect(isCompletePaidCheckoutReplay([legacy, legacy], [...cart, ...cart])).toBe(false);
});
it('rejects duplicate indices and a stored option that differs from the immutable paid item', () => {
  expect(matchesPaidCheckoutItems([{ ...legacy, paymentItemIndex: 0 }, { ...legacy, paymentItemIndex: 0 }], [...cart, ...cart], 'named-brand')).toBe(false);
  expect(matchesPaidCheckoutItems([{ ...legacy, selectedBookingOption: { pricingKey: 'other-option' } }], cart, 'named-brand')).toBe(false);
});
it('does not reinterpret another named tenant or an unproven guest quantity as historical default data', () => {
  expect(matchesPaidCheckoutItems([{ ...legacy, tenantId: 'other-brand' }], cart, 'named-brand')).toBe(false);
  expect(matchesPaidCheckoutItems([{ ...legacy, adultGuests: undefined }], cart, 'named-brand')).toBe(false);
  expect(matchesPaidCheckoutItems([{ ...legacy, adultGuests: undefined, guests: 1 }], cart, 'named-brand')).toBe(true);
  expect(isCompletePaidCheckoutReplay([{ ...legacy, adultGuests: undefined, guests: 1 }], cart)).toBe(true);
});

it('compares old option ids to ids, not newer pricing keys, while retaining both recorded identity checks', () => {
  const newerCart = [{ ...cart[0], selectedBookingOption: { id: 'old-option-id', pricingKey: 'new-pricing-key' } }];
  expect(matchesPaidCheckoutItems([{ ...legacy, selectedBookingOption: { id: 'old-option-id' } }], newerCart, 'named-brand')).toBe(true);
  expect(matchesPaidCheckoutItems([{ ...legacy, selectedBookingOption: { id: 'other-id' } }], newerCart, 'named-brand')).toBe(false);
  expect(matchesPaidCheckoutItems([{ ...legacy, selectedBookingOption: { id: 'old-option-id' } }], cart, 'named-brand')).toBe(false);
  expect(matchesPaidCheckoutItems([{ ...legacy, selectedBookingOption: { id: 'old-option-id', pricingKey: 'other-key' } }], newerCart, 'named-brand')).toBe(false);
});
