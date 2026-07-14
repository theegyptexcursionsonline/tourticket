import 'dotenv/config';
import dbConnect from '../lib/dbConnect';
import { backfillRevenuePricing } from '../lib/revenue/pricingBackfill';

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  await dbConnect();
  console.log(JSON.stringify(await backfillRevenuePricing(dryRun)));
}

run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
