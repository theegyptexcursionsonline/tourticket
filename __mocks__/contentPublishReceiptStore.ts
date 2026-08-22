// In-memory stand-in for the ContentPublishReceipt collection.
//
// Route-level idempotency tests run the REAL claim helper against this store so
// a replay is proven end-to-end (claim → apply → mark processed), not just
// asserted against a stubbed helper. It implements only the query shapes
// lib/content/publishIdempotency.ts actually issues.

export type FakeReceipt = {
  _id: string;
  idempotencyKey: string;
  tenantId: string;
  contentType: string;
  requestHash: string;
  state: 'pending' | 'completed';
  claimToken?: string;
  claimExpiresAt?: Date | null;
  statusCode?: number;
  response?: Record<string, unknown> | null;
  expiresAt?: Date;
};

type Selector = Record<string, unknown>;
type Update = { $set?: Record<string, unknown>; $unset?: Record<string, unknown> };

function duplicateKeyError() {
  return Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
}

export function createReceiptStore() {
  const receipts: FakeReceipt[] = [];
  let sequence = 0;
  let loseNextCompletion = false;

  const sameKey = (receipt: FakeReceipt, selector: Selector) =>
    receipt.idempotencyKey === selector.idempotencyKey &&
    receipt.tenantId === selector.tenantId &&
    receipt.contentType === selector.contentType;

  const model = {
    async create(doc: Omit<FakeReceipt, '_id'>): Promise<FakeReceipt> {
      if (receipts.some((receipt) => sameKey(receipt, doc as unknown as Selector))) {
        throw duplicateKeyError();
      }
      sequence += 1;
      const receipt: FakeReceipt = { ...doc, _id: `receipt-${sequence}` };
      receipts.push(receipt);
      return receipt;
    },

    findOne(selector: Selector) {
      return {
        lean: async () => receipts.find((receipt) => sameKey(receipt, selector)) ?? null,
      };
    },

    findOneAndUpdate(selector: Selector, update: Update) {
      return {
        lean: async () => {
          const receipt = receipts.find(
            (candidate) => candidate._id === selector._id && candidate.state === selector.state,
          );
          if (!receipt) return null;

          // Emulates the helper's stale-claim $or: only a lapsed (or absent)
          // claim may be taken over.
          const expiry = receipt.claimExpiresAt;
          const claimIsLive = expiry instanceof Date && expiry.getTime() > Date.now();
          if (claimIsLive) return null;

          Object.assign(receipt, update.$set ?? {});
          return receipt;
        },
      };
    },

    async updateOne(selector: Selector, update: Update) {
      if (loseNextCompletion) {
        loseNextCompletion = false;
        return { modifiedCount: 0 };
      }
      const receipt = receipts.find(
        (candidate) =>
          candidate._id === selector._id && candidate.claimToken === selector.claimToken,
      );
      if (!receipt) return { modifiedCount: 0 };

      Object.assign(receipt, update.$set ?? {});
      for (const field of Object.keys(update.$unset ?? {})) {
        delete (receipt as unknown as Record<string, unknown>)[field];
      }
      return { modifiedCount: 1 };
    },

    async deleteOne(selector: Selector) {
      const index = receipts.findIndex(
        (candidate) =>
          candidate._id === selector._id &&
          candidate.claimToken === selector.claimToken &&
          candidate.state === selector.state,
      );
      if (index === -1) return { deletedCount: 0 };
      receipts.splice(index, 1);
      return { deletedCount: 1 };
    },
  };

  return {
    model,
    receipts,
    // Simulates an attempt that died mid-publish: its claim lapses and the next
    // attempt may take it over.
    expireClaims() {
      for (const receipt of receipts) {
        if (receipt.claimExpiresAt) receipt.claimExpiresAt = new Date(0);
      }
    },
    loseNextCompletion() {
      loseNextCompletion = true;
    },
  };
}

export type ReceiptStore = ReturnType<typeof createReceiptStore>;
