// scripts/migrate-booking-feed-indexes.ts
//
// The two indexes the booking feed reads by (`app/api/internal/booking-feed`): changes in
// (updatedAt, _id) order and the service-day window in (date, _id) order. The feed is correct
// without them, only slower, so they are not declared on the Booking schema (that would build
// them on a production deploy). Creating them is an owner-approved launch step.
//
// Only creates what is missing. Never drops or rewrites an index; an index of the same name with
// a different key aborts the apply for review.
//
// USAGE
//   pnpm bookings:migrate-feed-indexes                       (dry run: reports only)
//   CONFIRM_BOOKING_FEED_INDEXES=YES ALLOW_REMOTE_BOOKING_FEED_INDEXES=YES \
//   pnpm bookings:migrate-feed-indexes --apply --confirm <database> --confirm-host <host>

import mongoose from 'mongoose';

type IndexKey = Record<string, 1 | -1>;
export const BOOKING_FEED_INDEXES: Array<{ name: string; key: IndexKey }> = [
  { name: 'booking_feed_changes', key: { updatedAt: 1, _id: 1 } },
  { name: 'booking_feed_window', key: { date: 1, _id: 1 } },
];

const sameKey = (actual: Record<string, unknown>, expected: IndexKey) => {
  const a = Object.entries(actual);
  const b = Object.entries(expected);
  return a.length === b.length && a.every(([field, direction], index) => field === b[index][0] && direction === b[index][1]);
};

export type IndexReport = { name: string; state: 'present' | 'present_as' | 'missing' | 'created'; existingName?: string };

/** What is there, and (with apply) what was created. Throws on a same-name, different-key index. */
export async function ensureBookingFeedIndexes(collection: mongoose.mongo.Collection, apply: boolean): Promise<IndexReport[]> {
  const existing = await collection.indexes().catch((error: { codeName?: string }) => {
    if (error?.codeName === 'NamespaceNotFound') return [];
    throw error;
  });
  const reports: IndexReport[] = [];
  for (const spec of BOOKING_FEED_INDEXES) {
    const byName = existing.find((index) => index.name === spec.name);
    if (byName) {
      if (!sameKey(byName.key, spec.key)) throw new Error(`${spec.name} exists with a different key; review it before applying.`);
      reports.push({ name: spec.name, state: 'present' });
      continue;
    }
    const byKey = existing.find((index) => sameKey(index.key, spec.key) && !index.partialFilterExpression);
    if (byKey) {
      reports.push({ name: spec.name, state: 'present_as', existingName: byKey.name });
      continue;
    }
    if (apply) {
      await collection.createIndex(spec.key, { name: spec.name });
      reports.push({ name: spec.name, state: 'created' });
    } else reports.push({ name: spec.name, state: 'missing' });
  }
  return reports;
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  const apply = process.argv.includes('--apply');
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 10_000 });
  try {
    const database = mongoose.connection.db!.databaseName;
    const host = mongoose.connection.host;
    console.log(`${apply ? '[apply]' : '[dry-run]'} database ${database} on ${host}`);
    if (apply) {
      if (argument('--confirm') !== database || argument('--confirm-host') !== host) {
        throw new Error(`Refusing to apply: expected --confirm ${database} --confirm-host ${host}.`);
      }
      if (process.env.CONFIRM_BOOKING_FEED_INDEXES !== 'YES') throw new Error('Refusing to apply without CONFIRM_BOOKING_FEED_INDEXES=YES.');
      const local = ['localhost', '127.0.0.1', '::1'].includes(host);
      if (!local && process.env.ALLOW_REMOTE_BOOKING_FEED_INDEXES !== 'YES') {
        throw new Error('Refusing a remote apply without ALLOW_REMOTE_BOOKING_FEED_INDEXES=YES.');
      }
    }
    const reports = await ensureBookingFeedIndexes(mongoose.connection.db!.collection('bookings'), apply);
    for (const report of reports) console.log(`${apply ? '[apply]' : '[dry-run]'} bookings.${report.name}: ${report.state}${report.existingName ? ` (${report.existingName})` : ''}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
