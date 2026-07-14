import { createHash } from 'node:crypto';

type GuestPrices = { adult?: number; child?: number; infant?: number };
type PricingOption = { pricingKey?: string; price?: number; originalPrice?: number; type?: string; guestPrices?: GuestPrices };
type PricingCatalogue = { discountPrice?: number; originalPrice?: number; revenueGuestPrices?: GuestPrices; bookingOptions?: PricingOption[] };

export function pricingCatalogueVersion(tour: PricingCatalogue) {
  const pricing = {
    standard: { price: Number(tour.discountPrice), originalPrice: Number(tour.originalPrice ?? tour.discountPrice), guestPrices: tour.revenueGuestPrices ?? null },
    options: (tour.bookingOptions || []).map((option) => ({
      key: option.pricingKey || '',
      price: Number(option.price),
      originalPrice: Number(option.originalPrice ?? option.price),
      type: option.type || '',
      guestPrices: option.guestPrices ?? null,
    })).sort((left, right) => left.key.localeCompare(right.key)),
  };
  return `pv1_${createHash('sha256').update(JSON.stringify(pricing)).digest('hex')}`;
}
