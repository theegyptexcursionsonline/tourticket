jest.mock('@/lib/models/AbuseRateLimit', () => ({
  __esModule: true,
  default: { findOneAndUpdate: jest.fn() },
}));

import {
  consumeAbuseLimit,
  extractTrustedClientAddress,
  hashPrivacyKey,
  type AbuseLimitBucket,
  type AbuseLimitStore,
} from '@/lib/security/distributedAbuseLimit';

class AtomicMemoryStore implements AbuseLimitStore {
  private counts = new Map<string, number>();

  async increment(bucket: AbuseLimitBucket): Promise<number> {
    const key = `${bucket.scope}:${bucket.keyHash}:${bucket.windowStart.toISOString()}`;
    const next = (this.counts.get(key) || 0) + 1;
    this.counts.set(key, next);
    return next;
  }
}

describe('distributed public-action abuse limits', () => {
  beforeEach(() => {
    process.env.ABUSE_LIMIT_HASH_SECRET = 'unit-test-secret-that-is-definitely-at-least-32-bytes';
  });

  afterEach(() => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
  });

  it('allows only the configured number under concurrent requests', async () => {
    const store = new AtomicMemoryStore();
    const results = await Promise.all(
      Array.from({ length: 100 }, () => consumeAbuseLimit({
        scope: 'contact-form:subject',
        identity: 'traveller@example.com',
        limit: 7,
        windowMs: 60_000,
        now: new Date('2026-07-13T10:00:05.000Z'),
      }, store)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(7);
    expect(Math.max(...results.map((result) => result.count))).toBe(100);
  });

  it('uses distinct fixed windows and returns a bounded retry time', async () => {
    const store = new AtomicMemoryStore();
    const first = await consumeAbuseLimit({
      scope: 'newsletter-subscribe:subject',
      identity: 'same@example.com',
      limit: 1,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:00:59.500Z'),
    }, store);
    const denied = await consumeAbuseLimit({
      scope: 'newsletter-subscribe:subject',
      identity: 'same@example.com',
      limit: 1,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:00:59.600Z'),
    }, store);
    const nextWindow = await consumeAbuseLimit({
      scope: 'newsletter-subscribe:subject',
      identity: 'same@example.com',
      limit: 1,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:01:00.000Z'),
    }, store);

    expect(first.allowed).toBe(true);
    expect(denied).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(nextWindow).toMatchObject({ allowed: true, count: 1 });
  });

  it('stores only one-way purpose-bound identity hashes', () => {
    const subject = '203.0.113.50|traveller@example.com';
    const first = hashPrivacyKey(subject, 'login');
    const secondPurpose = hashPrivacyKey(subject, 'contact');

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain('203.0.113.50');
    expect(first).not.toContain('traveller@example.com');
    expect(first).not.toBe(secondPurpose);
  });

  it('trusts the Netlify edge address and ignores spoofable forwarding headers', () => {
    const spoofed = {
      headers: new Headers({
        'x-forwarded-for': '198.51.100.10',
        'x-real-ip': '198.51.100.11',
      }),
    } as Request;
    const netlify = {
      headers: new Headers({ 'x-nf-client-connection-ip': '203.0.113.20' }),
    } as Request;

    expect(extractTrustedClientAddress(spoofed)).toBeNull();
    expect(extractTrustedClientAddress(netlify)).toBe('203.0.113.20');
  });
});
