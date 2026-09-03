import {
  SENTRY_CLIENT_SAMPLE_RATES,
  clientTraceSampleRate,
  filterClientSentryEvent,
  isBackgroundProviderNoise,
} from '@/lib/monitoring/sentryClientPolicy';

describe('client Sentry volume policy', () => {
  it.each([
    {
      message: 'FirebaseError: Installations: Generate Auth Token request failed (installations/request-failed).',
    },
    {
      logentry: {
        message: "@firebase/analytics: Failed to fetch this Firebase app's measurement ID (analytics/config-fetch-failed).",
      },
    },
  ])('drops repeated Firebase background-service noise', (event) => {
    expect(isBackgroundProviderNoise(event)).toBe(true);
    expect(filterClientSentryEvent(event)).toBeNull();
  });

  it('preserves a customer-auth failure even when the provider project is unavailable', () => {
    const event = {
      exception: {
        values: [{
          type: 'FirebaseError',
          value: 'Firebase Auth sign-in failed: auth/permission-denied; provider project has been suspended.',
        }],
      },
    };

    expect(isBackgroundProviderNoise(event)).toBe(false);
    expect(filterClientSentryEvent(event)).toBe(event);
  });

  it('preserves unrelated storefront exceptions', () => {
    const event = { message: 'Checkout confirmation render failed' };
    expect(filterClientSentryEvent(event)).toBe(event);
  });

  it('keeps development observable while bounding production traces', () => {
    expect(clientTraceSampleRate('/', 'development')).toBe(1);
    expect(clientTraceSampleRate('/', 'production')).toBe(SENTRY_CLIENT_SAMPLE_RATES.storefrontTrace);
    expect(clientTraceSampleRate('/admin/bookings', 'production')).toBe(SENTRY_CLIENT_SAMPLE_RATES.adminTrace);
    expect(SENTRY_CLIENT_SAMPLE_RATES.sessionReplay).toBeLessThan(SENTRY_CLIENT_SAMPLE_RATES.errorReplay);
    expect(SENTRY_CLIENT_SAMPLE_RATES.errorReplay).toBeLessThan(1);
  });
});
