import 'dotenv/config';
import dbConnect from '../lib/dbConnect';
import { backfillRevenuePricing } from '../lib/revenue/pricingBackfill';

function requestedTourIds() {
  const fromArguments = process.argv.flatMap((argument, index, all) => argument === '--tour-id' && all[index + 1] ? [all[index + 1]] : []);
  const fromEnvironment = (process.env.REVENUE_PRICING_TOUR_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
  return [...new Set([...fromArguments, ...fromEnvironment])];
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const materializeGuestPrices = process.argv.includes('--materialize-guest-prices');
  const tourIds = requestedTourIds();
  if (materializeGuestPrices && tourIds.length === 0) {
    throw new Error('Guest-price materialization requires at least one explicit --tour-id or REVENUE_PRICING_TOUR_IDS value.');
  }
  await dbConnect();
  console.log(JSON.stringify(await backfillRevenuePricing(dryRun, { tourIds, materializeGuestPrices })));
}

run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
