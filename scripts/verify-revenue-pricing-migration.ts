import mongoose from 'mongoose';
import Availability from '../lib/models/Availability';
import RevenuePriceOverride from '../lib/models/RevenuePriceOverride';
import Tour from '../lib/models/Tour';
import { backfillRevenuePricing } from '../lib/revenue/pricingBackfill';
import { resolveEffectivePrice } from '../lib/revenue/pricingResolver';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function run() {
  const uri = process.env.MONGODB_URI || '';
  const parsed = new URL(uri);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || !parsed.pathname.endsWith('revenuepilot_migration_test')) {
    throw new Error('Migration verification requires a local revenuepilot_migration_test database.');
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  const objectId = () => new mongoose.Types.ObjectId();
  const tour: any = await Tour.create({
    tenantId: 'default', title: 'Revenue Migration Test Tour', slug: 'revenue-migration-test-tour', destination: objectId(), category: [objectId()],
    description: 'A sufficiently detailed migration verification tour description.', discountPrice: 100, duration: '4 hours', image: 'https://example.invalid/tour.jpg',
    bookingOptions: [{ id: 'shared', type: 'group', label: 'Shared', price: 120 }, { id: 'private', type: 'private', label: 'Private', price: 200 }],
    availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '10:00', capacity: 10 }] }, isPublished: false,
  });
  const date = new Date('2026-08-15T00:00:00.000Z');
  await Availability.create({ tour: tour._id, date, slots: [{ time: '10:00', capacity: 10, booked: 0, blocked: false, price: 140 }] });

  const dryRun = await backfillRevenuePricing(true);
  assert(dryRun.toursKeyed === 1 && dryRun.legacyOverridesImported === 1, 'Dry run did not identify the expected migration work.');
  assert((await Tour.findById(tour._id).lean())?.bookingOptions?.every((option: any) => !option.pricingKey), 'Dry run mutated pricing keys.');
  assert(await RevenuePriceOverride.countDocuments() === 0, 'Dry run created an override.');

  const applied = await backfillRevenuePricing(false);
  assert(applied.toursKeyed === 1 && applied.legacyOverridesImported === 1, 'Migration did not apply expected changes.');
  const migrated: any = await Tour.findById(tour._id).lean();
  const keys = migrated.bookingOptions.map((option: any) => option.pricingKey);
  assert(keys.length === 2 && new Set(keys).size === 2 && keys.every(Boolean), 'Pricing keys were not uniquely persisted.');
  // Public quote resolution intentionally rejects drafts. Publish only inside
  // this disposable local database before checking storefront parity.
  await Tour.updateOne({ _id: tour._id }, { $set: { isPublished: true } });
  const effective = await resolveEffectivePrice({ tourId: String(tour._id), optionKey: 'standard', date: '2026-08-15', time: '10:00' });
  assert(effective.version === 1 && effective.prices.adult === 140 && effective.prices.child === 70, 'Legacy override does not resolve through the public pricing authority.');

  const replay = await backfillRevenuePricing(false);
  assert(replay.toursKeyed === 0 && replay.legacyOverridesImported === 0, 'Migration replay was not idempotent.');
  const afterReplay: any = await Tour.findById(tour._id).lean();
  assert(JSON.stringify(afterReplay.bookingOptions.map((option: any) => option.pricingKey)) === JSON.stringify(keys), 'Pricing keys changed after replay.');
  assert(await RevenuePriceOverride.countDocuments() === 1, 'Migration replay duplicated overrides.');

  console.log(JSON.stringify({ dryRun, applied, replay, parity: { effective, immutableKeys: keys }, isolatedDatabase: parsed.pathname.slice(1) }));
  await mongoose.disconnect();
}

run().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
