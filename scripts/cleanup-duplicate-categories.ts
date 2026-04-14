// scripts/cleanup-duplicate-categories.ts
//
// One-time data-cleanup migration for the 26+ duplicate category clusters
// currently in the `excursionsonline` MongoDB database (the "Menu duplicated
// items" bug — Issue #1 from the EEO tenant network review). Running this
// BEFORE deploying the header MegaMenu dedup is recommended; running after
// is also safe because the frontend aggregation pipeline already collapses
// duplicates defensively.
//
// What it does:
//   1. Scans `categories` and groups docs by `lower(trim(name))`.
//   2. For each cluster of size > 1, picks the "canonical" document (the one
//      most tours reference; ties broken by `order` then `createdAt`).
//   3. Re-points every tour whose `category` array references a duplicate to
//      the canonical _id. Uses `$addToSet` + `$pull` in one bulk write.
//   4. Deletes the duplicates.
//   5. Rebuilds the unique index on `{ slug: 1 }` after cleanup so new writes
//      can't reintroduce duplicates. (The schema has `unique: true` on name
//      and slug, but the live DB likely doesn't have the index built — these
//      duplicates are the proof of that.)
//
// Usage:
//   pnpm tsx scripts/cleanup-duplicate-categories.ts           # live run
//   pnpm tsx scripts/cleanup-duplicate-categories.ts --dry     # dry run
//   pnpm tsx scripts/cleanup-duplicate-categories.ts --no-reindex
//       # skip the final index rebuild (useful if the index already exists)
//
// Safe to re-run — idempotent after the first successful pass.

import 'dotenv/config';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

const DRY_RUN = process.argv.includes('--dry');
const SKIP_REINDEX = process.argv.includes('--no-reindex');

type CategoryDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  slug?: string;
  order?: number;
  createdAt?: Date;
};

function normalizeName(name?: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function chooseCanonical(
  cluster: CategoryDoc[],
): Promise<CategoryDoc> {
  // Canonical = the one referenced by the most tours. Ties: lowest `order`,
  // then oldest `createdAt`. This keeps whichever record was added first
  // (and has the most content pointing at it) as the survivor.
  const referenceCounts = await Promise.all(
    cluster.map(async (doc) => ({
      doc,
      count: await Tour.countDocuments({ category: doc._id }),
    })),
  );

  referenceCounts.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const orderA = a.doc.order ?? Number.POSITIVE_INFINITY;
    const orderB = b.doc.order ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    const createdA = a.doc.createdAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const createdB = b.doc.createdAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return createdA - createdB;
  });

  return referenceCounts[0].doc;
}

async function main() {
  console.log(`[cleanup-duplicate-categories] ${DRY_RUN ? 'DRY RUN' : 'LIVE'} starting...`);

  await dbConnect();

  // 1. Load every category document (id/name/slug/order/createdAt only).
  const docs = (await Category.find({}, {
    _id: 1,
    name: 1,
    slug: 1,
    order: 1,
    createdAt: 1,
  }).lean()) as unknown as CategoryDoc[];

  console.log(`  scanned: ${docs.length} categories`);

  // 2. Bucket by normalized name.
  const buckets = new Map<string, CategoryDoc[]>();
  for (const doc of docs) {
    const key = normalizeName(doc.name);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(doc);
  }

  const duplicateClusters = Array.from(buckets.entries()).filter(
    ([, cluster]) => cluster.length > 1,
  );

  console.log(`  duplicate clusters: ${duplicateClusters.length}`);
  if (duplicateClusters.length === 0) {
    console.log('  nothing to do — DB is already clean.');
    await mongoose.disconnect();
    return;
  }

  // 3. For each cluster, pick a canonical and rewrite tour references.
  let totalCanonicalReassigned = 0;
  let totalDeleted = 0;

  for (const [key, cluster] of duplicateClusters) {
    const canonical = await chooseCanonical(cluster);
    const duplicates = cluster.filter((d) => !d._id.equals(canonical._id));

    console.log(
      `\n  cluster "${key}": ${cluster.length} docs → keep ${String(canonical._id)}, remove ${duplicates.length}`,
    );

    const duplicateIds = duplicates.map((d) => d._id);

    // Re-point Tour.category references. `$addToSet` ensures the canonical id
    // gets added at most once even if a tour already referenced it; `$pullAll`
    // removes every duplicate id from the same array in one op.
    if (!DRY_RUN) {
      const reassign = await Tour.updateMany(
        { category: { $in: duplicateIds } },
        {
          $addToSet: { category: canonical._id },
        },
      );
      totalCanonicalReassigned += reassign.modifiedCount ?? 0;

      await Tour.updateMany(
        { category: { $in: duplicateIds } },
        {
          $pullAll: { category: duplicateIds },
        },
      );

      // 4. Delete the duplicate documents.
      const del = await Category.deleteMany({ _id: { $in: duplicateIds } });
      totalDeleted += del.deletedCount ?? 0;
    }
  }

  console.log('');
  console.log(`  tours re-pointed: ${DRY_RUN ? '(dry run)' : totalCanonicalReassigned}`);
  console.log(`  categories deleted: ${DRY_RUN ? '(dry run)' : totalDeleted}`);

  // 5. Rebuild the unique indexes so new inserts can't reintroduce duplicates.
  if (!DRY_RUN && !SKIP_REINDEX) {
    console.log('');
    console.log('  rebuilding unique indexes on name + slug...');
    try {
      await Category.collection.dropIndex('name_1').catch(() => undefined);
      await Category.collection.dropIndex('slug_1').catch(() => undefined);
      await Category.collection.createIndex({ name: 1 }, { unique: true });
      await Category.collection.createIndex({ slug: 1 }, { unique: true });
      console.log('  unique indexes rebuilt.');
    } catch (err) {
      console.error('  reindex failed (run again with --no-reindex if needed):', err);
    }
  }

  await mongoose.disconnect();
  console.log('\n[cleanup-duplicate-categories] done');
}

main().catch((err) => {
  console.error('[cleanup-duplicate-categories] FAILED:', err);
  process.exit(1);
});
