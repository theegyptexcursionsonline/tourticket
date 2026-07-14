import Availability from '@/lib/models/Availability';
import RevenuePriceOverride from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { ensureBookingOptionPricingKeys } from '@/lib/revenue/pricingKeys';
import { catalogueGuestPrices } from '@/lib/revenue/pricingResolver';
import { refreshTourPricingSummary } from '@/lib/revenue/pricingSummary';

export type PricingBackfillResult = {
  dryRun: boolean;
  toursScanned: number;
  toursKeyed: number;
  legacyOverridesImported: number;
  summariesRebuilt: number;
};

export async function backfillRevenuePricing(dryRun: boolean): Promise<PricingBackfillResult> {
  const tours = await Tour.find({ $or: [{ tenantId: 'default' }, { tenantId: null }, { tenantId: { $exists: false } }] });
  let keyed = 0;
  let legacy = 0;
  let summaries = 0;
  for (const tour of tours) {
    const options = ensureBookingOptionPricingKeys(String(tour._id), tour.toObject().bookingOptions);
    const needsKeys = (tour.bookingOptions || []).some((option) => !option.pricingKey);
    if (needsKeys) {
      // Avoid Tour post-save integrations (for example Algolia) during this data migration.
      if (!dryRun) await Tour.updateOne({ _id: tour._id }, { $set: { bookingOptions: options } }, { runValidators: true });
      keyed += 1;
    }
    const availabilities = await Availability.find({ tour: tour._id, 'slots.price': { $ne: null } }).lean();
    for (const availability of availabilities) {
      for (const slot of availability.slots || []) {
        const price = Number(slot.price);
        if (!Number.isFinite(price) || price < 0) continue;
        const prices = catalogueGuestPrices(price);
        const target = { tenantId: 'default', tourId: tour._id, optionKey: 'standard', date: availability.date, time: slot.time };
        if (await RevenuePriceOverride.exists(target)) continue;
        if (!dryRun) await RevenuePriceOverride.updateOne(
          target,
          { $setOnInsert: { currency: 'USD', prices, cataloguePrices: catalogueGuestPrices(Number(tour.discountPrice)), previousPrices: catalogueGuestPrices(Number(tour.discountPrice)), version: 1, source: 'legacy', recommendationId: 'legacy-import', executionId: `legacy:${availability._id}:${slot.time}`, active: true } },
          { upsert: true },
        );
        legacy += 1;
      }
    }
    if (!dryRun) {
      await refreshTourPricingSummary(String(tour._id));
      summaries += 1;
    }
  }
  return { dryRun, toursScanned: tours.length, toursKeyed: keyed, legacyOverridesImported: legacy, summariesRebuilt: summaries };
}
