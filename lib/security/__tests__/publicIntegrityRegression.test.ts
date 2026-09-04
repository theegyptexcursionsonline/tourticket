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
    expect(paymentIntent).toContain("checkout_experience: 'payment-element'");
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

  it('requires a platform reset email before a checkout guest becomes an account', () => {
    const passwordSignup = source('app/api/auth/signup/route.ts');
    const passwordReset = source('app/api/auth/reset-password/route.ts');
    const forgotPassword = source('app/api/auth/forgot-password/route.ts');

    expect(passwordSignup).not.toContain('findOneAndUpdate(');
    expect(passwordSignup).toContain('Forgot password?');
    expect(passwordReset).toContain('isGuestProfile: false');
    expect(passwordReset).toContain("authProvider: 'jwt'");
    expect(passwordReset).toContain('emailVerified: true');
    expect(passwordReset).toContain('findOneAndUpdate');
    expect(forgotPassword).toContain('issuePlatformResetUrl');
    expect(forgotPassword).not.toContain('Firebase');
  });

  it('ships no Firebase SDK, runtime helper, or customer synchronization route', () => {
    const pkg = JSON.parse(source('package.json')) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies).not.toHaveProperty('firebase');
    expect(pkg.dependencies).not.toHaveProperty('firebase-admin');
    expect(fs.existsSync(path.join(process.cwd(), 'lib/firebase/admin.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/firebase/config.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'app/api/auth/firebase/sync/route.ts'))).toBe(false);
    const csp = source('next.config.ts');
    expect(csp).not.toContain('firebaseio.com');
    expect(csp).not.toContain('firebaseapp.com');
  });

  it('does not offer a dead federated sign-in control on any storefront auth surface', () => {
    for (const file of [
      'app/[locale]/login/LoginClient.tsx',
      'app/[locale]/signup/SignupClient.tsx',
      'components/AuthModal.tsx',
      'components/auth/LoginModal.tsx',
      'components/auth/SignupModal.tsx',
    ]) {
      const component = source(file);
      expect(component).not.toContain('loginWithGoogle');
      expect(component).not.toMatch(/continue with google|sign in with google|sign up with google/i);
    }
    const context = source('contexts/AuthContext.tsx');
    expect(context).not.toContain('loginWithGoogle');
    expect(context).not.toContain('firebaseUser');
  });

  it('does not allow browser connections to arbitrary HTTPS or WebSocket origins', () => {
    const config = source('next.config.ts');
    expect(config).not.toContain("connect-src 'self' https: wss:");
    expect(config).toContain('https://*.algolia.net');
    expect(config).toContain('https://*.googleapis.com');
    expect(config).toContain('https://*.stripe.com');
    expect(config).toContain('https://*.intercom.io');
    expect(config).toContain("script-src-attr 'none'");
    // The voice assistant's launcher and frame load from its own origin; a
    // CSP edit that drops it silently kills the assistants page.
    expect(config).toContain('voiceWidgetOrigin');
  // The voice widget iframe needs top-level microphone delegation; a hard
  // microphone=() deny silently kills every call on the embedding pages.
  expect(config).toContain('microphone=(self "${voiceWidgetOrigin}")');
    // The booking launcher and catalogue API are separate exact origins.
    // Omitting either leaves the product-owned booking section stuck loading.
    expect(config).toContain('bookingWidgetOrigin');
    expect(config).toContain('bookingApiOrigin');
    expect(config).toContain('https://booking.foxestechnology.com');
    expect(config).toContain('https://foxes-api-production.up.railway.app');
    expect(config).toContain('https://search.foxestechnology.com');
  });

  it('uses the versioned Booking API contract on the assistants page', () => {
    const assistants = source('app/[locale]/assistants/AssistantsClient.tsx');
    expect(assistants).toContain(
      'https://foxes-api-production.up.railway.app/api/v1',
    );
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
