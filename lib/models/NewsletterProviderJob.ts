import mongoose, { Schema, type Model } from 'mongoose';
import { NEWSLETTER_SOURCES, type NewsletterSource } from '@/lib/models/NewsletterConsent';

export interface NewsletterProviderJobDocument {
  tenantId: string;
  consentId: mongoose.Types.ObjectId;
  source: NewsletterSource;
  normalizedEmail: string;
  action: 'double_opt_in' | 'unsubscribe';
  generation: number;
  idempotencyKey: string;
  status: 'queued' | 'processing' | 'submitted' | 'failed' | 'cancelled';
  attempts: number;
  availableAt: Date;
  lastErrorCode?: string;
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterProviderJobSchema = new Schema<NewsletterProviderJobDocument>(
  {
    tenantId: { type: String, required: true, trim: true, maxlength: 80, index: true },
    consentId: { type: Schema.Types.ObjectId, required: true, ref: 'NewsletterConsent', index: true },
    source: { type: String, required: true, enum: NEWSLETTER_SOURCES },
    normalizedEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    action: { type: String, required: true, enum: ['double_opt_in', 'unsubscribe'] },
    generation: { type: Number, required: true, min: 1 },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 64 },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'processing', 'submitted', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    availableAt: { type: Date, required: true, default: Date.now, index: true },
    lastErrorCode: { type: String, trim: true, maxlength: 80 },
    // Raw delivery addresses are needed only while the durable job is
    // actionable. Every job has bounded retention; terminal workers may move
    // this earlier after redacting provider-specific data.
    purgeAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

NewsletterProviderJobSchema.index(
  { idempotencyKey: 1 },
  { unique: true, name: 'newsletter_provider_job_idempotency_unique' },
);
NewsletterProviderJobSchema.index({ status: 1, availableAt: 1, createdAt: 1 });

const NewsletterProviderJob: Model<NewsletterProviderJobDocument> =
  mongoose.models.NewsletterProviderJob
  || mongoose.model<NewsletterProviderJobDocument>('NewsletterProviderJob', NewsletterProviderJobSchema);

export default NewsletterProviderJob;
