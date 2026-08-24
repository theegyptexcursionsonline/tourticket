// scripts/migrate-blog-slug-tenant-index.ts
//
// Non-destructive index preparation for the Content Engine receiver.
//
// The receiver refuses every publish unless the live database contains the
// exact compound uniqueness, crash-recovery provenance, receipt claim and TTL
// indexes below. This script only creates missing collections/indexes. It never
// drops or rewrites an existing index; an incompatible index aborts the apply so
// remediation can be separately reviewed and backed up.
//
// USAGE
//   pnpm content:migrate-tenant-index
//   CONFIRM_CONTENT_INDEX_MIGRATION=YES \\
//   CONTENT_INDEX_MIGRATION_BACKUP_ID=<backup-or-snapshot-id> \\
//   ALLOW_REMOTE_CONTENT_INDEX_MIGRATION=YES \\
//   pnpm content:migrate-tenant-index --apply --confirm <database> --confirm-host <host>
//
// Dry-run is the default. Production application is an owner-approved launch
// step and must not be bundled into a code release.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import mongoose from 'mongoose';

type IndexKey = Record<string, 1 | -1>;
type IndexSpec = {
  name: string;
  key: IndexKey;
  unique?: true;
  sparse?: true;
  expireAfterSeconds?: number;
};

type CollectionPlan = {
  collection: string;
  createIfMissing?: boolean;
  logicalDefaultUniqueFields?: string[];
  requiredIndexes: IndexSpec[];
};

const PLANS: CollectionPlan[] = [
  {
    collection: 'contentpublishreceipts',
    createIfMissing: true,
    requiredIndexes: [
      {
        name: 'idempotencyKey_1_tenantId_1_contentType_1',
        key: { idempotencyKey: 1, tenantId: 1, contentType: 1 },
        unique: true,
      },
      {
        name: 'expiresAt_1',
        key: { expiresAt: 1 },
        expireAfterSeconds: 0,
      },
    ],
  },
  {
    collection: 'blogs',
    logicalDefaultUniqueFields: ['slug'],
    requiredIndexes: [
      { name: 'slug_1_tenantId_1', key: { slug: 1, tenantId: 1 }, unique: true },
      {
        name: 'contentEnginePublishReceiptId_1',
        key: { contentEnginePublishReceiptId: 1 },
        unique: true,
        sparse: true,
      },
    ],
  },
  {
    collection: 'destinations',
    logicalDefaultUniqueFields: ['slug', 'name'],
    requiredIndexes: [
      { name: 'slug_1_tenantId_1', key: { slug: 1, tenantId: 1 }, unique: true },
      { name: 'name_1_tenantId_1', key: { name: 1, tenantId: 1 }, unique: true },
      {
        name: 'contentEnginePublishReceiptId_1',
        key: { contentEnginePublishReceiptId: 1 },
        unique: true,
        sparse: true,
      },
    ],
  },
  {
    collection: 'categories',
    logicalDefaultUniqueFields: ['slug', 'name'],
    requiredIndexes: [
      { name: 'tenantId_1_slug_1', key: { tenantId: 1, slug: 1 }, unique: true },
      { name: 'tenantId_1_name_1', key: { tenantId: 1, name: 1 }, unique: true },
      {
        name: 'contentEnginePublishReceiptId_1',
        key: { contentEnginePublishReceiptId: 1 },
        unique: true,
        sparse: true,
      },
    ],
  },
];

const apply = process.argv.includes('--apply');

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function tag(): string {
  return apply ? '[apply]' : '[dry-run]';
}

function sameOrderedKey(actual: Record<string, unknown>, expected: IndexKey): boolean {
  const actualEntries = Object.entries(actual);
  const expectedEntries = Object.entries(expected);
  return (
    actualEntries.length === expectedEntries.length &&
    actualEntries.every(
      ([field, direction], index) =>
        field === expectedEntries[index]?.[0] && direction === expectedEntries[index]?.[1],
    )
  );
}

function exactOptions(
  actual: {
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    partialFilterExpression?: unknown;
    collation?: unknown;
    hidden?: boolean;
  },
  expected: IndexSpec,
): boolean {
  return (
    Boolean(actual.unique) === Boolean(expected.unique) &&
    Boolean(actual.sparse) === Boolean(expected.sparse) &&
    actual.expireAfterSeconds === expected.expireAfterSeconds &&
    actual.partialFilterExpression === undefined &&
    actual.collation === undefined &&
    actual.hidden !== true
  );
}

function isLocalHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

async function assertNoLogicalDefaultDuplicates(
  collection: mongoose.mongo.Collection,
  fields: string[],
): Promise<void> {
  for (const field of fields) {
    const duplicates = await collection
      .aggregate([
        {
          $match: {
            [field]: { $type: 'string' },
            $or: [
              { tenantId: { $exists: false } },
              { tenantId: null },
              { tenantId: '' },
              { tenantId: 'default' },
            ],
          },
        },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 1 },
      ])
      .toArray();

    if (duplicates.length > 0) {
      throw new Error(
        `${collection.collectionName}: duplicate logical-default ${field} values exist; reconcile them before index preparation.`,
      );
    }
    console.log(`${tag()} ${collection.collectionName}: logical-default ${field} values are unique`);
  }
}

async function assertApplyAuthority(database: string, host: string): Promise<void> {
  if (!apply) return;

  if (argument('--confirm') !== database || argument('--confirm-host') !== host) {
    throw new Error(
      `Refusing to apply: expected --confirm ${database} --confirm-host ${host}.`,
    );
  }
  if (process.env.CONFIRM_CONTENT_INDEX_MIGRATION !== 'YES') {
    throw new Error('Refusing to apply without CONFIRM_CONTENT_INDEX_MIGRATION=YES.');
  }
  if (!process.env.CONTENT_INDEX_MIGRATION_BACKUP_ID?.trim()) {
    throw new Error('Refusing to apply without CONTENT_INDEX_MIGRATION_BACKUP_ID.');
  }
  if (
    !isLocalHost(host) &&
    process.env.ALLOW_REMOTE_CONTENT_INDEX_MIGRATION !== 'YES'
  ) {
    throw new Error('Refusing remote apply without ALLOW_REMOTE_CONTENT_INDEX_MIGRATION=YES.');
  }
}

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connect.');

  const database = mongoose.connection.name;
  const host = mongoose.connection.host;
  console.log(`${tag()} Connected to database "${database}" on ${host}`);
  await assertApplyAuthority(database, host);

  if (!apply) {
    console.log('[dry-run] No changes will be written.');
  }

  let changes = 0;
  for (const plan of PLANS) {
    const collections = await db.listCollections({ name: plan.collection }).toArray();
    if (collections.length === 0) {
      if (!plan.createIfMissing) {
        throw new Error(
          `${plan.collection}: required content collection is missing; refusing to create it implicitly.`,
        );
      }
      changes += 1;
      console.log(`${tag()} ${plan.collection}: CREATE COLLECTION`);
      if (apply) await db.createCollection(plan.collection);
    }

    const collection = db.collection(plan.collection);
    const existing = collections.length === 0 && !apply ? [] : await collection.indexes();
    await assertNoLogicalDefaultDuplicates(
      collection,
      plan.logicalDefaultUniqueFields ?? [],
    );

    for (const required of plan.requiredIndexes) {
      const sameName = existing.find((index) => index.name === required.name);
      if (
        sameName &&
        (!sameOrderedKey(sameName.key, required.key) || !exactOptions(sameName, required))
      ) {
        throw new Error(
          `${plan.collection}: index ${required.name} exists with an incompatible specification.`,
        );
      }

      const sameKey = existing.find((index) => sameOrderedKey(index.key, required.key));
      if (sameKey) {
        if (!exactOptions(sameKey, required)) {
          throw new Error(
            `${plan.collection}: key ${JSON.stringify(required.key)} exists with incompatible options.`,
          );
        }
        console.log(
          `${tag()} ${plan.collection}: ${sameKey.name ?? required.name} exact specification present`,
        );
        continue;
      }

      changes += 1;
      console.log(`${tag()} ${plan.collection}: CREATE ${required.name}`);
      if (apply) {
        await collection.createIndex(required.key, {
          name: required.name,
          unique: required.unique,
          sparse: required.sparse,
          expireAfterSeconds: required.expireAfterSeconds,
        });
      }
    }
  }

  console.log(
    `${tag()} ${changes === 0 ? 'Nothing to do; exact indexes are present.' : `${changes} non-destructive change(s) ${apply ? 'applied' : 'pending'}.`}`,
  );
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
