import 'dotenv/config';
import dbConnect from '../lib/dbConnect';
import Tour from '../lib/models/Tour';
import Availability from '../lib/models/Availability';
import RevenuePriceOverride from '../lib/models/RevenuePriceOverride';
import { ensureBookingOptionPricingKeys } from '../lib/revenue/pricingKeys';
import { catalogueGuestPrices } from '../lib/revenue/pricingResolver';

async function run() {
  await dbConnect();
  const tours: any[] = await Tour.find({ $or: [{ tenantId: 'default' }, { tenantId: null }, { tenantId: { $exists: false } }] });
  let keyed = 0;
  let legacy = 0;
  for (const tour of tours) {
    const options = ensureBookingOptionPricingKeys(String(tour._id), tour.bookingOptions?.map((option: any) => option.toObject?.() ?? option));
    if (JSON.stringify(options) !== JSON.stringify(tour.bookingOptions)) {
      tour.bookingOptions = options;
      await tour.save();
      keyed += 1;
    }
    const availabilities: any[] = await Availability.find({ tour: tour._id, 'slots.price': { $ne: null } }).lean();
    for (const availability of availabilities) {
      for (const slot of availability.slots || []) {
        const price = Number(slot.price);
        if (!Number.isFinite(price) || price < 0) continue;
        const prices = catalogueGuestPrices(price);
        await RevenuePriceOverride.updateOne(
          { tenantId: 'default', tourId: tour._id, optionKey: 'standard', date: availability.date, time: slot.time },
          { $setOnInsert: { currency: 'USD', prices, cataloguePrices: catalogueGuestPrices(Number(tour.discountPrice)), previousPrices: catalogueGuestPrices(Number(tour.discountPrice)), version: 1, source: 'legacy', recommendationId: 'legacy-import', executionId: `legacy:${availability._id}:${slot.time}`, active: true } },
          { upsert: true },
        );
        legacy += 1;
      }
    }
  }
  console.log(JSON.stringify({ toursScanned: tours.length, toursKeyed: keyed, legacyOverridesImported: legacy }));
}

run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
