import mongoose, { Schema, type Model } from 'mongoose';

export const NEWSLETTER_SOURCES = ['footer', 'blog', 'contact', 'account'] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];
export type NewsletterConsentStatus = 'pending' | 'confirmed' | 'unsubscribed';
export type NewsletterProviderState =
  | 'not_configured'
  | 'queued'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'unsubscribed';

export interface NewsletterConsentDocument {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  source: NewsletterSource;
  normalizedEmail: string;
  status: NewsletterConsentStatus;
  consentVersion: string;
  generation: number;
  consentedAt?: Date;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  providerState: NewsletterProviderState;
  providerLastAttemptAt?: Date;
  providerErrorCode?: string;
  latestRequestHash: string;
  latestAgentHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterConsentSchema = new Schema<NewsletterConsentDocument>(
  {
    tenantId: { type: String, required: true, trim: true, maxlength: 80, index: true },
    source: { type: String, required: true, enum: NEWSLETTER_SOURCES },
    normalizedEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'unsubscribed'],
      default: 'pending',
      index: true,
    },
    consentVersion: { type: String, required: true, trim: true, maxlength: 80 },
    generation: { type: Number, required: true, min: 1, default: 1 },
    consentedAt: Date,
    confirmedAt: Date,
    unsubscribedAt: Date,
    providerState: {
      type: String,
      required: true,
      enum: ['not_configured', 'queued', 'submitted', 'confirmed', 'failed', 'unsubscribed'],
      default: 'not_configured',
      index: true,
    },
    providerLastAttemptAt: Date,
    providerErrorCode: { type: String, trim: true, maxlength: 80 },
    // Audit correlation values are one-way HMACs. Raw IP addresses and user
    // agents are deliberately not persisted.
    latestRequestHash: { type: String, required: true, maxlength: 64 },
    latestAgentHash: { type: String, required: true, maxlength: 64 },
  },
  { timestamps: true },
);

NewsletterConsentSchema.index(
  { tenantId: 1, source: 1, normalizedEmail: 1 },
  { unique: true, name: 'newsletter_tenant_source_email_unique' },
);
NewsletterConsentSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });

const NewsletterConsent: Model<NewsletterConsentDocument> =
  mongoose.models.NewsletterConsent
  || mongoose.model<NewsletterConsentDocument>('NewsletterConsent', NewsletterConsentSchema);

export default NewsletterConsent;
