import { createHash } from 'crypto';
import NewsletterProviderJob from '@/lib/models/NewsletterProviderJob';
import type {
  NewsletterConsentStatus,
  NewsletterSource,
} from '@/lib/models/NewsletterConsent';

export type NewsletterProviderAction = 'double_opt_in' | 'unsubscribe';

export interface NewsletterProviderQueueInput {
  tenantId: string;
  consentId: string;
  source: NewsletterSource;
  normalizedEmail: string;
  action: NewsletterProviderAction;
  generation: number;
}

export interface NewsletterProviderQueueAdapter {
  enqueue(input: NewsletterProviderQueueInput & { idempotencyKey: string }): Promise<{ replayed: boolean }>;
}

const mongoQueueAdapter: NewsletterProviderQueueAdapter = {
  async enqueue(input) {
    const result = await NewsletterProviderJob.updateOne(
      { idempotencyKey: input.idempotencyKey },
      {
        $setOnInsert: {
          tenantId: input.tenantId,
          consentId: input.consentId,
          source: input.source,
          normalizedEmail: input.normalizedEmail,
          action: input.action,
          generation: input.generation,
          idempotencyKey: input.idempotencyKey,
          status: 'queued',
          attempts: 0,
          availableAt: new Date(),
          purgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
        },
      },
      { upsert: true },
    );
    return { replayed: result.upsertedCount === 0 };
  },
};

export function newsletterProviderQueueConfigured(): boolean {
  return process.env.NEWSLETTER_PROVIDER_MODE === 'durable_outbox';
}

export function newsletterProviderJobIsCurrent(
  job: { action: NewsletterProviderAction; generation: number },
  consent: { status: NewsletterConsentStatus; generation: number },
): boolean {
  if (job.generation !== consent.generation) return false;
  return job.action === 'double_opt_in'
    ? consent.status === 'pending'
    : consent.status === 'unsubscribed';
}

export async function cancelStaleDoubleOptInJobs(consentId: string, currentGeneration: number) {
  return NewsletterProviderJob.updateMany(
    {
      consentId,
      action: 'double_opt_in',
      generation: { $lt: currentGeneration },
      status: { $in: ['queued', 'processing'] },
    },
    {
      $set: {
        status: 'cancelled',
        lastErrorCode: 'suppressed_by_unsubscribe',
        purgeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
      },
    },
  );
}

export async function queueNewsletterProviderAction(
  input: NewsletterProviderQueueInput,
  adapter: NewsletterProviderQueueAdapter = mongoQueueAdapter,
): Promise<{ state: 'not_configured' | 'queued'; replayed: boolean }> {
  // This module intentionally never makes an external request or sends email.
  // A separately reviewed worker may lease these jobs and call a provider.
  if (!newsletterProviderQueueConfigured()) {
    return { state: 'not_configured', replayed: false };
  }

  const idempotencyKey = createHash('sha256')
    .update(`${input.tenantId}\0${input.consentId}\0${input.action}\0${input.generation}`)
    .digest('hex');
  const queued = await adapter.enqueue({ ...input, idempotencyKey });
  return { state: 'queued', replayed: queued.replayed };
}
