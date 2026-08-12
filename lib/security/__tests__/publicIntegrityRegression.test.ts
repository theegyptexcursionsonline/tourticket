import fs from 'fs';
import path from 'path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('public integrity route regressions', () => {
  it('does not return mock newsletter success or call an external newsletter provider', () => {
    const route = source('app/api/subscribe/route.ts');
    const provider = source('lib/newsletter/providerQueue.ts');

    expect(route).not.toContain('Successfully subscribed!');
    expect(route).toContain("status: 'pending'");
    expect(route).toContain('providerState');
    expect(provider).not.toContain('fetch(');
  });

  it('persists one blog like per tenant, post and signed visitor', () => {
    const route = source('app/api/blog/[slug]/like/route.ts');
    const model = source('lib/models/BlogLike.ts');

    expect(model).toContain('{ tenantId: 1, blogId: 1, visitorHash: 1 }');
    expect(model).toContain('unique: true');
    expect(route).toContain('$setOnInsert');
    expect(route).toContain('countDocuments');
    expect(route).toContain('$max');
    expect(route).not.toContain("$inc: { likes: 1 }");
  });

  it('uses distributed limits on public auth and message routes', () => {
    for (const file of [
      'app/api/admin/login/route.ts',
      'app/api/auth/login/route.ts',
      'app/api/auth/signup/route.ts',
      'app/api/auth/forgot-password/route.ts',
      'app/api/auth/firebase/login-check/route.ts',
      'app/api/booking/verify/[reference]/route.ts',
      'app/api/contact/route.ts',
      'app/api/subscribe/route.ts',
      'app/api/discounts/verify/route.ts',
    ]) {
      expect(source(file)).toContain('enforcePublicActionLimits');
    }
    expect(source('lib/checkout/webCheckoutPreparation.ts')).toContain('enforcePublicActionLimits');
    expect(source('app/api/contact/route.ts')).not.toContain('submissionTracker');
    expect(source('lib/security/distributedAbuseLimit.ts')).not.toContain("request.headers.get('x-forwarded-for')");
  });

  it('does not let anonymous non-card requests reserve departure inventory', () => {
    const checkout = source('app/api/checkout/route.ts');
    expect(checkout).toContain("if (paymentMethod !== 'card')");
    expect(checkout).toContain("code: 'UNSUPPORTED_PAYMENT_METHOD'");
  });

  it('bounds payment initialization and exposes only the coupon preview fields', () => {
    const paymentIntent = source('app/api/checkout/create-payment-intent/route.ts');
    const webCheckout = source('lib/checkout/webCheckoutPreparation.ts');
    const coupon = source('app/api/discounts/verify/route.ts');

    expect(webCheckout).toContain('readBoundedJson');
    expect(paymentIntent).toContain("rateLimitAction: 'checkout-payment-intent'");
    expect(coupon).toContain('readBoundedJson');
    expect(coupon).toContain("action: 'discount-verify'");
    expect(coupon).toContain('data: { discountType: discount.discountType, value: discount.value }');
    expect(coupon).not.toContain('data: discount }');
  });

  it('binds PaymentIntent retries to a client-stable checkout attempt', () => {
    const paymentIntent = source('app/api/checkout/create-payment-intent/route.ts');
    const webCheckout = source('lib/checkout/webCheckoutPreparation.ts');
    const paymentForm = source('components/StripePaymentForm.tsx');
    const checkout = source('app/[locale]/checkout/page.tsx');
    const webhook = source('app/api/webhooks/stripe/route.ts');

    expect(webCheckout).toContain('normalizeCheckoutAttemptId(body.checkoutAttemptId)');
    expect(webCheckout).toContain('checkoutAttemptId,');
    expect(webCheckout).toContain('checkout_attempt_id: checkoutAttemptId');
    expect(paymentIntent).toContain('buildCheckoutPaymentIdempotencyKey(prepared.quoteBinding)');
    expect(paymentForm).toContain('getOrCreateCheckoutAttemptId()');
    expect(paymentForm).toContain('checkoutAttemptId,');
    expect(checkout).toContain('completeCheckoutAttempt();');
    expect(webhook).toContain('metadata.checkout_attempt_id !== persistedQuote.checkoutAttemptId');
  });

  it('keeps public booking verification redacted, bounded and non-cacheable', () => {
    const route = source('app/api/booking/verify/[reference]/route.ts');

    expect(route).toContain("action: 'booking-verify'");
    expect(route).toContain("'Cache-Control': 'private, no-store'");
    expect(route).toContain("'Retry-After': String(rate.retryAfterSeconds)");
    expect(route).not.toContain('customerEmail');
    expect(route).not.toContain('specialRequests');
    expect(route).not.toContain('emergencyContact');
    expect(route).not.toContain('totalPrice');
  });

  it('requires verified ownership before a checkout guest can be claimed', () => {
    const firebase = source('lib/firebase/authHelpers.ts');
    const passwordSignup = source('app/api/auth/signup/route.ts');

    expect(firebase).toContain('firebaseUser.emailVerified !== true');
    expect(firebase).toContain('guestProfileClaimFilter(email, user._id)');
    expect(passwordSignup).toContain("'EMAIL_VERIFICATION_REQUIRED'");
    expect(passwordSignup).not.toContain('guestProfileClaimFilter(');
    expect(passwordSignup).not.toContain('findOneAndUpdate(');
  });

  it('does not allow browser connections to arbitrary HTTPS or WebSocket origins', () => {
    const config = source('next.config.ts');
    expect(config).not.toContain("connect-src 'self' https: wss:");
    expect(config).toContain('https://*.algolia.net');
    expect(config).toContain('https://*.googleapis.com');
    expect(config).toContain('https://*.stripe.com');
    expect(config).toContain('https://*.intercom.io');
    expect(config).toContain("script-src-attr 'none'");
    expect(config).toContain('https://search.foxestechnology.com');
  });

  it('keeps main-admin metrics tenant-scoped and lets booking operators read tour labels', () => {
    const dashboard = source('app/api/admin/dashboard/route.ts');
    const tourOptions = source('app/api/admin/tours/options/route.ts');

    expect(dashboard).toContain("Booking.distinct('user'");
    expect(dashboard).not.toContain('User.countDocuments()');
    expect(tourOptions).toContain("permissions: ['manageTours', 'manageBookings']");
    expect(tourOptions).toContain('requireAll: false');
    expect(tourOptions).toContain('DEFAULT_TENANT_FILTER');
  });
});
