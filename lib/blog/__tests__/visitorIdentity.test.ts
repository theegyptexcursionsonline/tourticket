jest.mock('@/lib/models/AbuseRateLimit', () => ({
  __esModule: true,
  default: { findOneAndUpdate: jest.fn() },
}));

import {
  createBlogVisitorToken,
  hashBlogVisitor,
  verifyBlogVisitorToken,
} from '@/lib/blog/visitorIdentity';

describe('anonymous blog-like visitor identity', () => {
  beforeEach(() => {
    process.env.ABUSE_LIMIT_HASH_SECRET = 'unit-test-secret-that-is-definitely-at-least-32-bytes';
  });

  afterEach(() => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
  });

  it('round-trips a signed visitor token and rejects tampering', () => {
    const token = createBlogVisitorToken();
    const visitorId = verifyBlogVisitorToken(token);

    expect(visitorId).toBeTruthy();
    expect(verifyBlogVisitorToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it('creates tenant-bound one-way visitor hashes', () => {
    const token = createBlogVisitorToken();
    const visitorId = verifyBlogVisitorToken(token)!;
    const eeo = hashBlogVisitor(visitorId, 'default');
    const anotherTenant = hashBlogVisitor(visitorId, 'another-tenant');

    expect(eeo).toMatch(/^[a-f0-9]{64}$/);
    expect(eeo).not.toContain(visitorId);
    expect(eeo).not.toBe(anotherTenant);
  });
});
