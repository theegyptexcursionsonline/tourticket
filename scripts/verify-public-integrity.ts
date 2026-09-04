import assert from 'node:assert/strict';

function assertDisposableLocalDatabase(uri: string) {
  const parsed = new URL(uri);
  const host = parsed.hostname.toLowerCase();
  const database = parsed.pathname.replace(/^\//, '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error('Public-integrity verification refuses non-local MongoDB hosts.');
  }
  if (database !== 'tourticket_public_integrity_test') {
    throw new Error('Use the disposable database named tourticket_public_integrity_test.');
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  assertDisposableLocalDatabase(uri);
  process.env.ABUSE_LIMIT_HASH_SECRET = 'disposable-public-integrity-test-secret-32-bytes';
  process.env.NEWSLETTER_PROVIDER_MODE = 'durable_outbox';

  const mongoose = (await import('mongoose')).default;
  const { default: dbConnect, closeConnection } = await import('@/lib/dbConnect');
  const { consumeAbuseLimit } = await import('@/lib/security/distributedAbuseLimit');
  const {
    requestNewsletterSubscription,
    unsubscribeNewsletter,
    confirmNewsletterConsent,
  } = await import('@/lib/newsletter/subscriptionService');
  const { default: NewsletterConsent } = await import('@/lib/models/NewsletterConsent');
  const { default: NewsletterProviderJob } = await import('@/lib/models/NewsletterProviderJob');
  const { default: Blog } = await import('@/lib/models/Blog');
  const { default: BlogLike } = await import('@/lib/models/BlogLike');
  const { default: User } = await import('@/lib/models/user');
  const { createResetToken } = await import('@/lib/auth/passwordReset');
  const { POST: signup } = await import('@/app/api/auth/signup/route');
  const { POST: resetPassword } = await import('@/app/api/auth/reset-password/route');
  const { POST: likeBlog } = await import('@/app/api/blog/[slug]/like/route');
  const { NextRequest } = await import('next/server');

  await dbConnect();
  await mongoose.connection.db!.dropDatabase();
  await Promise.all([
    mongoose.model('AbuseRateLimit').syncIndexes(),
    NewsletterConsent.syncIndexes(),
    NewsletterProviderJob.syncIndexes(),
    BlogLike.syncIndexes(),
    User.syncIndexes(),
  ]);

  const limiterResults = await Promise.all(
    Array.from({ length: 100 }, () => consumeAbuseLimit({
      scope: 'verification:subject',
      identity: 'one-subject',
      limit: 7,
      windowMs: 60_000,
      now: new Date('2026-07-13T10:00:00.000Z'),
    })),
  );
  assert.equal(limiterResults.filter((result) => result.allowed).length, 7);
  assert.equal(Math.max(...limiterResults.map((result) => result.count)), 100);

  const audit = { requestHash: 'a'.repeat(64), agentHash: 'b'.repeat(64) };
  const subscription = {
    tenantId: 'default',
    source: 'footer' as const,
    normalizedEmail: 'integrity@example.com',
    audit,
  };
  const first = await requestNewsletterSubscription(subscription);
  const replay = await requestNewsletterSubscription(subscription);
  assert.equal(first.providerState, 'queued');
  assert.equal(replay.replayed, true);
  assert.equal(await NewsletterProviderJob.countDocuments({ action: 'double_opt_in' }), 1);

  const suppression = await unsubscribeNewsletter(subscription);
  assert.equal(suppression.status, 'unsubscribed');
  const consentAfterSuppression = await NewsletterConsent.findOne({ normalizedEmail: subscription.normalizedEmail });
  assert.equal(consentAfterSuppression?.generation, 2);
  assert.equal(
    await NewsletterProviderJob.countDocuments({ action: 'double_opt_in', status: 'cancelled' }),
    1,
  );
  assert.equal(await confirmNewsletterConsent(String(consentAfterSuppression!._id), 1), false);

  const resubscription = await requestNewsletterSubscription(subscription);
  assert.equal(resubscription.status, 'pending');
  const currentConsent = await NewsletterConsent.findOne({ normalizedEmail: subscription.normalizedEmail });
  assert.equal(currentConsent?.generation, 3);
  assert.equal(await confirmNewsletterConsent(String(currentConsent!._id), 2), false);
  assert.equal(await confirmNewsletterConsent(String(currentConsent!._id), 3), true);

  await Blog.collection.insertOne({
    tenantId: 'default',
    title: 'Integrity verification blog post',
    slug: 'integrity-verification-post',
    excerpt: 'A disposable test post used only for local integrity verification.',
    content: 'Test content '.repeat(20),
    featuredImage: '/pyramid.png',
    category: 'travel-tips',
    tags: [],
    author: 'Test',
    readTime: 1,
    status: 'published',
    featured: false,
    allowComments: false,
    views: 0,
    likes: 0,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const firstLikeRequest = new NextRequest('http://localhost/api/blog/integrity-verification-post/like', {
    method: 'POST',
    headers: {
      'user-agent': 'public-integrity-verifier',
      'x-nf-client-connection-ip': '127.0.0.1',
    },
  });
  const firstLike = await likeBlog(firstLikeRequest, {
    params: Promise.resolve({ slug: 'integrity-verification-post' }),
  });
  assert.equal(firstLike.status, 200);
  const cookie = firstLike.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);

  const replayedLikes = await Promise.all(
    Array.from({ length: 20 }, () => likeBlog(
      new NextRequest('http://localhost/api/blog/integrity-verification-post/like', {
        method: 'POST',
        headers: {
          cookie,
          'user-agent': 'public-integrity-verifier',
          'x-nf-client-connection-ip': '127.0.0.1',
        },
      }),
      { params: Promise.resolve({ slug: 'integrity-verification-post' }) },
    )),
  );
  assert.ok(replayedLikes.every((response) => response.status === 200));
  assert.equal(await BlogLike.countDocuments({}), 1);
  assert.equal((await Blog.findOne({ slug: 'integrity-verification-post' }))?.likes, 1);

  const legacyGuest = await User.create({
    firstName: 'Booking',
    lastName: 'Guest',
    email: 'legacy-claim@example.com',
    phone: '+201111111111',
    country: 'Egypt',
    role: 'customer',
    permissions: [],
    isActive: true,
    isGuestProfile: true,
  });
  const unsafePasswordClaim = await signup(new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'public-integrity-verifier',
      'x-nf-client-connection-ip': '127.0.0.2',
    },
    body: JSON.stringify({
      firstName: 'Claimed',
      lastName: 'Without Proof',
      email: legacyGuest.email,
      password: 'UnsafePassword123!',
    }),
  }));
  assert.equal(unsafePasswordClaim.status, 409);
  assert.equal((await unsafePasswordClaim.json()).code, 'ACCOUNT_EXISTS');
  const unchangedLegacyGuest = await User.findById(legacyGuest._id).select('+password +firebaseUid');
  assert.equal(unchangedLegacyGuest?.phone, '+201111111111');
  assert.equal(unchangedLegacyGuest?.country, 'Egypt');
  assert.equal(unchangedLegacyGuest?.isGuestProfile, true);
  assert.equal(unchangedLegacyGuest?.password, undefined);
  assert.equal(unchangedLegacyGuest?.firebaseUid, undefined);

  const issuedReset = createResetToken();
  legacyGuest.passwordResetTokenHash = issuedReset.tokenHash;
  legacyGuest.passwordResetExpires = issuedReset.expiresAt;
  await legacyGuest.save({ validateBeforeSave: false });

  const resetRequest = () => new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'public-integrity-verifier',
      'x-nf-client-connection-ip': '127.0.0.3',
    },
    body: JSON.stringify({
      token: issuedReset.token,
      password: 'RecoveredPassword123!',
      confirmPassword: 'RecoveredPassword123!',
    }),
  });
  const competingResetResults = await Promise.all([
    resetPassword(resetRequest()),
    resetPassword(resetRequest()),
  ]);
  assert.deepEqual(
    competingResetResults.map((response) => response.status).sort(),
    [200, 400],
  );

  const recoveredGuest = await User.findById(legacyGuest._id).select('+password +firebaseUid');
  assert.ok(recoveredGuest?.password);
  assert.equal(recoveredGuest?.isGuestProfile, false);
  assert.equal(recoveredGuest?.authProvider, 'jwt');
  assert.equal(recoveredGuest?.emailVerified, true);
  assert.equal(recoveredGuest?.phone, '+201111111111');
  assert.equal(recoveredGuest?.country, 'Egypt');
  assert.equal(recoveredGuest?.firebaseUid, undefined);

  await mongoose.connection.db!.dropDatabase();
  await closeConnection();
  console.log('Public-integrity verification passed: limiter concurrency, consent ordering, suppression, idempotent likes, proof-gated guest recovery, and single-use reset claims.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
