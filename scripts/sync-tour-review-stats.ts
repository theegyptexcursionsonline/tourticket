/**
 * Bring every trip's review count and average in line with its published
 * reviews (rule: lib/reviews/tourReviewStats.ts).
 *
 *   pnpm reviews:sync-stats            dry run: prints what would change, writes nothing
 *   pnpm reviews:sync-stats --apply    writes the changes it printed
 *
 * It only ever reads reviews and bookings and writes the trip's own two
 * figures; it never creates, edits or deletes a review.
 */
import 'dotenv/config';
import dbConnect from '../lib/dbConnect';
import { planTourReviewStatsBackfill } from '../lib/reviews/tourReviewStatsBackfill';

async function run() {
  const apply = process.argv.includes('--apply');
  await dbConnect();
  const report = await planTourReviewStatsBackfill({ apply });
  console.log(JSON.stringify(report, null, 2));
}

run().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
