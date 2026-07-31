// scripts/migrate-blog-slug-tenant-index.ts
//
// Replaces the legacy single-field unique indexes on `blogs` and `destinations`
// with the tenant-scoped compound indexes the models now declare.
//
// WHY THIS EXISTS
// ---------------
// `Blog` and `Destination` declare `{ slug: 1, tenantId: 1 }` (and
// `{ name: 1, tenantId: 1 }` for destinations) as unique. Mongoose only ever
// ADDS indexes — it never drops one that already exists in a live database. A
// production collection created before per-tenant scoping still carries the old
// `slug_1` / `name_1` unique indexes, which keep enforcing global uniqueness.
//
// Until those legacy indexes are dropped, a content-engine publish for a second
// tenant that reuses a default-site slug fails with E11000 even though the
// application logic considers it valid. RUN THIS BEFORE two tenants are allowed
// to share a slug on this storefront.
//
// USAGE
//   pnpm blog:migrate-tenant-index                        # dry run (default)
//   pnpm blog:migrate-tenant-index --apply --confirm <db> # performs the changes
//
// Dry run is the default and writes nothing. `--apply` additionally requires
// `--confirm <database>` naming the database it is about to modify, because
// MONGODB_URI is picked up from .env.local when it is not set explicitly — the
// guard is what stops an accidental apply against the wrong (live) database.
//
// The script is idempotent: re-running it after a successful apply is a no-op.
// It never drops a legacy index before the replacement compound index exists,
// so uniqueness is enforced at every moment of the migration.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import mongoose from 'mongoose';

type IndexSpec = {
  name: string;
  key: Record<string, 1 | -1>;
  unique?: boolean;
};

type CollectionPlan = {
  collection: string;
  // Legacy single-field unique indexes that must go.
  legacyIndexNames: string[];
  // Compound tenant-scoped indexes that must exist first.
  requiredIndexes: IndexSpec[];
};

const PLANS: CollectionPlan[] = [
  {
    collection: 'blogs',
    legacyIndexNames: ['slug_1'],
    requiredIndexes: [{ name: 'slug_1_tenantId_1', key: { slug: 1, tenantId: 1 }, unique: true }],
  },
  {
    collection: 'destinations',
    legacyIndexNames: ['slug_1', 'name_1'],
    requiredIndexes: [
      { name: 'slug_1_tenantId_1', key: { slug: 1, tenantId: 1 }, unique: true },
      { name: 'name_1_tenantId_1', key: { name: 1, tenantId: 1 }, unique: true },
    ],
  },
];

const apply = process.argv.includes('--apply');

function confirmedDatabase(): string | null {
  const index = process.argv.indexOf('--confirm');
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function label(dryRun: boolean) {
  return dryRun ? '[dry-run]' : '[apply]';
}

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connect.');

  const database = mongoose.connection.name;
  const tag = label(!apply);
  console.log(`${tag} Connected to database "${database}" on ${mongoose.connection.host}`);

  if (apply) {
    const confirmed = confirmedDatabase();
    if (confirmed !== database) {
      await mongoose.disconnect();
      throw new Error(
        `Refusing to apply: --confirm must name the connected database. ` +
          `Expected "--confirm ${database}", got ${confirmed ? `"${confirmed}"` : 'nothing'}.`,
      );
    }
  } else {
    console.log('[dry-run] No changes will be written. Re-run with --apply to perform them.\n');
  }

  let changes = 0;

  for (const plan of PLANS) {
    const collections = await db.listCollections({ name: plan.collection }).toArray();
    if (collections.length === 0) {
      console.log(`${tag} ${plan.collection}: collection not present — skipping`);
      continue;
    }

    const collection = db.collection(plan.collection);
    const existing = await collection.indexes();
    const existingNames = new Set(existing.map((index) => index.name));

    // 1. Ensure the compound replacement exists BEFORE dropping anything, so
    //    slug uniqueness is never briefly unenforced.
    for (const required of plan.requiredIndexes) {
      if (existingNames.has(required.name)) {
        console.log(`${tag} ${plan.collection}: ${required.name} already present`);
        continue;
      }
      changes += 1;
      console.log(`${tag} ${plan.collection}: CREATE ${required.name} (unique)`);
      if (apply) {
        await collection.createIndex(required.key, {
          name: required.name,
          unique: required.unique,
        });
      }
    }

    // 2. Drop the legacy single-field unique indexes.
    for (const legacyName of plan.legacyIndexNames) {
      const legacy = existing.find((index) => index.name === legacyName);
      if (!legacy) {
        console.log(`${tag} ${plan.collection}: ${legacyName} already absent`);
        continue;
      }
      if (!legacy.unique) {
        // A non-unique helper index of the same name is harmless — the models
        // declare plain `index: true` on slug — so leave it alone.
        console.log(`${tag} ${plan.collection}: ${legacyName} is not unique — leaving in place`);
        continue;
      }
      changes += 1;
      console.log(`${tag} ${plan.collection}: DROP ${legacyName} (legacy global-unique)`);
      if (apply) await collection.dropIndex(legacyName);
    }
  }

  console.log(
    `\n${tag} ${changes === 0 ? 'Nothing to do — already migrated.' : `${changes} index change(s) ${apply ? 'applied' : 'pending'}.`}`,
  );
  if (!apply && changes > 0) {
    console.log(`[dry-run] Re-run with --apply --confirm ${database} to perform them.`);
  }

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
