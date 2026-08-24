import {
  contentReceiverIndexesReady,
  type ReceiverIndexDatabase,
} from '../receiverIndexReadiness';

type Index = {
  name?: string;
  key: Record<string, number>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
  collation?: Record<string, unknown>;
  hidden?: boolean;
};

const receiptIndexes: Index[] = [
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
];

function database(collections: Record<string, ReadonlyArray<Index>>): ReceiverIndexDatabase {
  return {
    collection(name: string) {
      return {
        indexes: jest.fn(async () => {
          const indexes = collections[name];
          if (!indexes) throw new Error('missing');
          return [...indexes];
        }),
      };
    },
  };
}

describe('contentReceiverIndexesReady', () => {
  it.each([
    [
      'blog',
      {
        blogs: [
          { key: { slug: 1, tenantId: 1 }, unique: true },
          { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
        ],
      },
    ],
    [
      'destination',
      {
        destinations: [
          { key: { slug: 1, tenantId: 1 }, unique: true },
          { key: { name: 1, tenantId: 1 }, unique: true },
          { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
        ],
      },
    ],
    [
      'category',
      {
        categories: [
          { key: { tenantId: 1, slug: 1 }, unique: true },
          { key: { tenantId: 1, name: 1 }, unique: true },
          { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
        ],
      },
    ],
  ] as const)('accepts exact %s content and receipt indexes', async (contentType, content) => {
    await expect(
      contentReceiverIndexesReady(
        contentType,
        database({ ...content, contentpublishreceipts: receiptIndexes }),
      ),
    ).resolves.toBe(true);
  });

  it('rejects a familiar index name when its key order or uniqueness is wrong', async () => {
    await expect(
      contentReceiverIndexesReady(
        'blog',
        database({
          contentpublishreceipts: receiptIndexes,
          blogs: [
            {
              name: 'slug_1_tenantId_1',
              key: { tenantId: 1, slug: 1 },
              unique: true,
            },
            { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
          ],
        }),
      ),
    ).resolves.toBe(false);

    await expect(
      contentReceiverIndexesReady(
        'blog',
        database({
          contentpublishreceipts: receiptIndexes,
          blogs: [
            { key: { slug: 1, tenantId: 1 }, unique: false },
            { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
          ],
        }),
      ),
    ).resolves.toBe(false);
  });

  it('rejects a missing receipt uniqueness or TTL guarantee', async () => {
    await expect(
      contentReceiverIndexesReady(
        'category',
        database({
          contentpublishreceipts: [receiptIndexes[0]!],
          categories: [
            { key: { tenantId: 1, slug: 1 }, unique: true },
            { key: { tenantId: 1, name: 1 }, unique: true },
            { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
          ],
        }),
      ),
    ).resolves.toBe(false);
  });

  it.each([
    { sparse: true },
    { partialFilterExpression: { tenantId: { $exists: true } } },
    { collation: { locale: 'en', strength: 2 } },
    { hidden: true },
  ])('rejects non-exact receipt uniqueness options: %p', async (extraOptions) => {
    const incompatibleReceipts: Index[] = [
      { ...receiptIndexes[0]!, ...extraOptions },
      receiptIndexes[1]!,
    ];

    await expect(
      contentReceiverIndexesReady(
        'blog',
        database({
          contentpublishreceipts: incompatibleReceipts,
          blogs: [
            { key: { slug: 1, tenantId: 1 }, unique: true },
            { key: { contentEnginePublishReceiptId: 1 }, unique: true, sparse: true },
          ],
        }),
      ),
    ).resolves.toBe(false);
  });

  it('fails closed when the database or collection cannot be read', async () => {
    await expect(contentReceiverIndexesReady('blog', null)).resolves.toBe(false);
    const unavailable = {
      collection: () => ({ indexes: async () => { throw new Error('provider down'); } }),
    };
    await expect(contentReceiverIndexesReady('blog', unavailable)).resolves.toBe(false);
  });
});
