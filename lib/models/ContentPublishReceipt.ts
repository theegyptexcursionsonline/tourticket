import mongoose, { Document, Schema, Model } from 'mongoose';

// Idempotency receipt for foxes-content-engine publishes.
//
// The engine generates and persists one `Idempotency-Key` per publish before
// its first attempt, then retries on timeout/5xx (see the engine's
// docs/ADAPTER-CONTRACT.md). Without a receipt a call that succeeded on this
// side but never returned would publish the same post twice on the live site.
//
// Receipts follow the crash-safe claim → apply → mark-processed order used by
// the revenue price-write gate: a receipt is only marked `completed` after the
// content write has committed, so an interrupted publish stays retryable.
export type ContentPublishReceiptState = 'pending' | 'completed';

export interface IContentPublishReceipt extends Document {
  idempotencyKey: string;
  // Normalized owning tenant ('default' for the flagship site). Keys are scoped
  // per tenant so one tenant can never replay another tenant's response.
  tenantId: string;
  contentType: string;
  requestHash: string;
  state: ContentPublishReceiptState;
  claimToken?: string;
  claimExpiresAt?: Date;
  statusCode?: number;
  response?: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPublishReceiptSchema: Schema<IContentPublishReceipt> = new Schema(
  {
    idempotencyKey: { type: String, required: true, trim: true },
    tenantId: { type: String, required: true, trim: true, default: 'default' },
    contentType: { type: String, required: true, trim: true },
    requestHash: { type: String, required: true },
    state: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
      required: true,
    },
    claimToken: { type: String },
    claimExpiresAt: { type: Date },
    statusCode: { type: Number },
    response: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// One receipt per (key, tenant, type). Scoping by tenant keeps a key replayed
// by a different tenant from returning the original tenant's record.
ContentPublishReceiptSchema.index(
  { idempotencyKey: 1, tenantId: 1, contentType: 1 },
  { unique: true },
);

// The contract requires the mapping to survive at least 24h; we keep 30 days
// and let Mongo expire the rest.
ContentPublishReceiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ContentPublishReceipt: Model<IContentPublishReceipt> =
  mongoose.models.ContentPublishReceipt ||
  mongoose.model<IContentPublishReceipt>('ContentPublishReceipt', ContentPublishReceiptSchema);

export default ContentPublishReceipt;
