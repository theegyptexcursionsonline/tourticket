export type SupportedReceiverContentType = 'blog' | 'destination' | 'category';

type IndexKey = Record<string, 1 | -1>;
type IndexInfo = {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: unknown;
  collation?: unknown;
  hidden?: boolean;
};

type IndexCollection = {
  indexes(): Promise<IndexInfo[]>;
};

export type ReceiverIndexDatabase = {
  collection(name: string): IndexCollection;
};

type IndexRequirement = {
  collection: string;
  key: IndexKey;
  unique?: true;
  sparse?: true;
  expireAfterSeconds?: number;
};

const RECEIPT_REQUIREMENTS: IndexRequirement[] = [
  {
    collection: 'contentpublishreceipts',
    key: { idempotencyKey: 1, tenantId: 1, contentType: 1 },
    unique: true,
  },
  {
    collection: 'contentpublishreceipts',
    key: { expiresAt: 1 },
    expireAfterSeconds: 0,
  },
];

const CONTENT_REQUIREMENTS: Record<SupportedReceiverContentType, IndexRequirement[]> = {
  blog: [
    { collection: 'blogs', key: { slug: 1, tenantId: 1 }, unique: true },
    {
      collection: 'blogs',
      key: { contentEnginePublishReceiptId: 1 },
      unique: true,
      sparse: true,
    },
  ],
  destination: [
    { collection: 'destinations', key: { slug: 1, tenantId: 1 }, unique: true },
    { collection: 'destinations', key: { name: 1, tenantId: 1 }, unique: true },
    {
      collection: 'destinations',
      key: { contentEnginePublishReceiptId: 1 },
      unique: true,
      sparse: true,
    },
  ],
  category: [
    { collection: 'categories', key: { tenantId: 1, slug: 1 }, unique: true },
    { collection: 'categories', key: { tenantId: 1, name: 1 }, unique: true },
    {
      collection: 'categories',
      key: { contentEnginePublishReceiptId: 1 },
      unique: true,
      sparse: true,
    },
  ],
};

function sameOrderedKey(actual: Record<string, unknown> | undefined, expected: IndexKey): boolean {
  if (!actual) return false;
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
function satisfies(index: IndexInfo, requirement: IndexRequirement): boolean {
  return (
    sameOrderedKey(index.key, requirement.key) &&
    Boolean(index.unique) === Boolean(requirement.unique) &&
    Boolean(index.sparse) === Boolean(requirement.sparse) &&
    index.expireAfterSeconds === requirement.expireAfterSeconds &&
    index.partialFilterExpression === undefined &&
    index.collation === undefined &&
    index.hidden !== true
  );
}

/**
 * Read-only activation gate for claim-before-effects publishing.
 *
 * Route code must call this after connecting and before it creates a receipt.
 * Mongoose schema declarations are not proof that production built the indexes;
 * this checks the live collection specifications, including key order/options.
 */
export async function contentReceiverIndexesReady(
  contentType: SupportedReceiverContentType,
  database: ReceiverIndexDatabase | null | undefined,
): Promise<boolean> {
  if (!database) return false;

  const requirements = [...RECEIPT_REQUIREMENTS, ...CONTENT_REQUIREMENTS[contentType]];
  const byCollection = new Map<string, IndexInfo[]>();

  try {
    for (const requirement of requirements) {
      let indexes = byCollection.get(requirement.collection);
      if (!indexes) {
        indexes = await database.collection(requirement.collection).indexes();
        byCollection.set(requirement.collection, indexes);
      }
      if (!indexes.some((index) => satisfies(index, requirement))) return false;
    }
    return true;
  } catch {
    // Missing collections/indexes and provider errors all disable publishing.
    return false;
  }
}
