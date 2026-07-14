jest.mock('@/lib/models/NewsletterProviderJob', () => ({
  __esModule: true,
  default: { updateOne: jest.fn(), updateMany: jest.fn() },
}));

import {
  newsletterProviderJobIsCurrent,
  queueNewsletterProviderAction,
  type NewsletterProviderQueueAdapter,
} from '@/lib/newsletter/providerQueue';

const input = {
  tenantId: 'default',
  consentId: '507f1f77bcf86cd799439011',
  source: 'footer' as const,
  normalizedEmail: 'traveller@example.com',
  action: 'double_opt_in' as const,
  generation: 1,
};

describe('newsletter provider outbox boundary', () => {
  const previousMode = process.env.NEWSLETTER_PROVIDER_MODE;

  afterEach(() => {
    if (previousMode === undefined) delete process.env.NEWSLETTER_PROVIDER_MODE;
    else process.env.NEWSLETTER_PROVIDER_MODE = previousMode;
    jest.restoreAllMocks();
  });

  it('fails closed without queue configuration', async () => {
    delete process.env.NEWSLETTER_PROVIDER_MODE;
    const adapter: NewsletterProviderQueueAdapter = { enqueue: jest.fn() };

    await expect(queueNewsletterProviderAction(input, adapter)).resolves.toEqual({
      state: 'not_configured',
      replayed: false,
    });
    expect(adapter.enqueue).not.toHaveBeenCalled();
  });

  it('queues a deterministic idempotency key and never sends externally', async () => {
    process.env.NEWSLETTER_PROVIDER_MODE = 'durable_outbox';
    const fetchSpy = jest.spyOn(global, 'fetch');
    const enqueue = jest.fn().mockResolvedValue({ replayed: false });
    const adapter: NewsletterProviderQueueAdapter = { enqueue };

    await expect(queueNewsletterProviderAction(input, adapter)).resolves.toEqual({
      state: 'queued',
      replayed: false,
    });
    await queueNewsletterProviderAction(input, adapter);

    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueue.mock.calls[0][0].idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(enqueue.mock.calls[1][0].idempotencyKey).toBe(enqueue.mock.calls[0][0].idempotencyKey);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects stale or suppressed double-opt-in jobs by generation and state', () => {
    expect(newsletterProviderJobIsCurrent(
      { action: 'double_opt_in', generation: 2 },
      { status: 'pending', generation: 2 },
    )).toBe(true);
    expect(newsletterProviderJobIsCurrent(
      { action: 'double_opt_in', generation: 1 },
      { status: 'unsubscribed', generation: 2 },
    )).toBe(false);
    expect(newsletterProviderJobIsCurrent(
      { action: 'double_opt_in', generation: 2 },
      { status: 'unsubscribed', generation: 2 },
    )).toBe(false);
    expect(newsletterProviderJobIsCurrent(
      { action: 'unsubscribe', generation: 2 },
      { status: 'unsubscribed', generation: 2 },
    )).toBe(true);
    expect(newsletterProviderJobIsCurrent(
      { action: 'unsubscribe', generation: 2 },
      { status: 'pending', generation: 3 },
    )).toBe(false);
  });
});
