import NewsletterConsent, {
  type NewsletterProviderState,
  type NewsletterSource,
} from '@/lib/models/NewsletterConsent';
import {
  cancelStaleDoubleOptInJobs,
  queueNewsletterProviderAction,
} from '@/lib/newsletter/providerQueue';

export const NEWSLETTER_CONSENT_VERSION = 'eeo-newsletter-v1-2026-07';

interface ConsentAuditMetadata {
  requestHash: string;
  agentHash: string;
}

export interface NewsletterLifecycleResult {
  status: 'pending' | 'confirmed' | 'unsubscribed';
  providerState: NewsletterProviderState;
  replayed: boolean;
  deliveryReady: boolean;
}

function isDuplicateKey(error: unknown): boolean {
  return (error as { code?: number }).code === 11000;
}

async function loadConsent(key: {
  tenantId: string;
  source: NewsletterSource;
  normalizedEmail: string;
}) {
  return NewsletterConsent.findOne(key);
}

export async function requestNewsletterSubscription(input: {
  tenantId: string;
  source: NewsletterSource;
  normalizedEmail: string;
  audit: ConsentAuditMetadata;
}): Promise<NewsletterLifecycleResult> {
  const key = {
    tenantId: input.tenantId,
    source: input.source,
    normalizedEmail: input.normalizedEmail,
  };
  const now = new Date();
  let consent = await loadConsent(key);
  let replayed = Boolean(consent);

  if (!consent) {
    try {
      consent = await NewsletterConsent.create({
        ...key,
        status: 'pending',
        consentVersion: NEWSLETTER_CONSENT_VERSION,
        generation: 1,
        consentedAt: now,
        providerState: 'not_configured',
        latestRequestHash: input.audit.requestHash,
        latestAgentHash: input.audit.agentHash,
      });
      replayed = false;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      consent = await loadConsent(key);
      replayed = true;
    }
  }

  if (!consent) throw new Error('newsletter_consent_not_persisted');

  if (consent.status === 'confirmed') {
    await NewsletterConsent.updateOne(
      { _id: consent._id },
      {
        $set: {
          latestRequestHash: input.audit.requestHash,
          latestAgentHash: input.audit.agentHash,
        },
      },
    );
    return {
      status: 'confirmed',
      providerState: consent.providerState,
      replayed: true,
      deliveryReady: true,
    };
  }

  if (consent.status === 'unsubscribed') {
    const reactivated = await NewsletterConsent.findOneAndUpdate(
      { _id: consent._id, status: 'unsubscribed' },
      {
        $set: {
          status: 'pending',
          consentVersion: NEWSLETTER_CONSENT_VERSION,
          consentedAt: now,
          confirmedAt: null,
          unsubscribedAt: null,
          providerState: 'not_configured',
          providerErrorCode: null,
          latestRequestHash: input.audit.requestHash,
          latestAgentHash: input.audit.agentHash,
        },
        $inc: { generation: 1 },
      },
      { new: true },
    );
    consent = reactivated || await loadConsent(key);
    replayed = !reactivated;
  } else {
    await NewsletterConsent.updateOne(
      { _id: consent._id },
      {
        $set: {
          latestRequestHash: input.audit.requestHash,
          latestAgentHash: input.audit.agentHash,
        },
      },
    );
  }

  if (!consent) throw new Error('newsletter_consent_not_persisted');

  try {
    const queued = await queueNewsletterProviderAction({
      tenantId: consent.tenantId,
      consentId: String(consent._id),
      source: consent.source,
      normalizedEmail: consent.normalizedEmail,
      action: 'double_opt_in',
      generation: consent.generation,
    });
    await NewsletterConsent.updateOne(
      { _id: consent._id, status: 'pending' },
      {
        $set: {
          providerState: queued.state,
          providerLastAttemptAt: now,
          providerErrorCode: queued.state === 'not_configured' ? 'provider_not_configured' : null,
        },
      },
    );
    return {
      status: 'pending',
      providerState: queued.state,
      replayed: replayed || queued.replayed,
      deliveryReady: queued.state === 'queued',
    };
  } catch {
    await NewsletterConsent.updateOne(
      { _id: consent._id, status: 'pending' },
      {
        $set: {
          providerState: 'failed',
          providerLastAttemptAt: now,
          providerErrorCode: 'provider_queue_unavailable',
        },
      },
    );
    return {
      status: 'pending',
      providerState: 'failed',
      replayed,
      deliveryReady: false,
    };
  }
}

export async function unsubscribeNewsletter(input: {
  tenantId: string;
  source: NewsletterSource;
  normalizedEmail: string;
  audit: ConsentAuditMetadata;
}): Promise<NewsletterLifecycleResult> {
  const key = {
    tenantId: input.tenantId,
    source: input.source,
    normalizedEmail: input.normalizedEmail,
  };
  const now = new Date();
  let consent = await loadConsent(key);
  let replayed = Boolean(consent);

  if (!consent) {
    try {
      consent = await NewsletterConsent.create({
        ...key,
        status: 'unsubscribed',
        consentVersion: NEWSLETTER_CONSENT_VERSION,
        generation: 1,
        unsubscribedAt: now,
        providerState: 'unsubscribed',
        latestRequestHash: input.audit.requestHash,
        latestAgentHash: input.audit.agentHash,
      });
      replayed = false;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      consent = await loadConsent(key);
      replayed = true;
    }
  }

  if (!consent) throw new Error('newsletter_consent_not_persisted');
  let generation = consent.generation;
  if (consent.status !== 'unsubscribed') {
    generation += 1;
    const transition = await NewsletterConsent.updateOne(
      { _id: consent._id, status: { $ne: 'unsubscribed' } },
      {
        $set: {
          status: 'unsubscribed',
          generation,
          unsubscribedAt: now,
          providerState: 'unsubscribed',
          providerErrorCode: null,
          latestRequestHash: input.audit.requestHash,
          latestAgentHash: input.audit.agentHash,
        },
      },
    );
    if (transition.modifiedCount === 0) {
      const current = await loadConsent(key);
      if (!current) throw new Error('newsletter_consent_not_persisted');
      consent = current;
      generation = current.generation;
      replayed = true;
    }
  } else {
    await NewsletterConsent.updateOne(
      { _id: consent._id },
      {
        $set: {
          latestRequestHash: input.audit.requestHash,
          latestAgentHash: input.audit.agentHash,
        },
      },
    );
  }

  // A suppression transition invalidates every older double-opt-in job before
  // an unsubscribe job can be queued. Workers must also call
  // newsletterProviderJobIsCurrent immediately before provider submission.
  await cancelStaleDoubleOptInJobs(String(consent._id), generation);

  // If a provider is later enabled, this creates a durable suppression job.
  // In the current implementation it never sends an external request.
  try {
    const queued = await queueNewsletterProviderAction({
      tenantId: consent.tenantId,
      consentId: String(consent._id),
      source: consent.source,
      normalizedEmail: consent.normalizedEmail,
      action: 'unsubscribe',
      generation,
    });
    const providerState = queued.state === 'queued' ? 'queued' : 'unsubscribed';
    await NewsletterConsent.updateOne(
      { _id: consent._id, generation, status: 'unsubscribed' },
      {
        $set: {
          providerState,
          providerLastAttemptAt: now,
          providerErrorCode: null,
        },
      },
    );

    return {
      status: 'unsubscribed',
      providerState,
      replayed: replayed || queued.replayed,
      deliveryReady: true,
    };
  } catch {
    await NewsletterConsent.updateOne(
      { _id: consent._id, generation, status: 'unsubscribed' },
      {
        $set: {
          providerState: 'failed',
          providerLastAttemptAt: now,
          providerErrorCode: 'provider_queue_unavailable',
        },
      },
    );
    return {
      status: 'unsubscribed',
      providerState: 'failed',
      replayed,
      deliveryReady: false,
    };
  }
}

// Provider workers must use this server-side transition after their own
// signed confirmation callback has been verified. It is intentionally not a
// public browser endpoint.
export async function confirmNewsletterConsent(consentId: string, generation: number): Promise<boolean> {
  const now = new Date();
  const result = await NewsletterConsent.updateOne(
    { _id: consentId, generation, status: 'pending' },
    {
      $set: {
        status: 'confirmed',
        providerState: 'confirmed',
        confirmedAt: now,
        providerLastAttemptAt: now,
        providerErrorCode: null,
      },
    },
  );
  return result.modifiedCount === 1;
}
