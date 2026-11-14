/**
 * @jest-environment node
 */
// Fails if the provider guard in jest.setup.js is removed or weakened: no
// test may send real mail, messages or payments, whatever keys the machine has.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { scrubProviderEnv, isProviderHost } = require('../test-support/providerGuard');

describe('provider guard', () => {
  it('is installed for every test file', () => {
    expect((globalThis as { __providerGuardInstalled?: boolean }).__providerGuardInstalled).toBe(true);
  });

  it('refuses a fetch to the mail provider and the payment provider', async () => {
    await expect(fetch('https://api.mailgun.net/v3/mail.example.test/messages', { method: 'POST' })).rejects.toThrow(/may not reach a real provider/);
    await expect(fetch('https://api.stripe.com/v1/payment_intents', { method: 'POST' })).rejects.toThrow(/may not reach a real provider/);
  });

  it('refuses http, https and mail-port connections', () => {
    expect(() => https.request('https://api.eu.mailgun.net/v3/x')).toThrow(/may not reach a real provider/);
    expect(() => https.request({ hostname: 'api.stripe.com', path: '/v1/charges', method: 'POST' })).toThrow(/may not reach a real provider/);
    expect(() => http.get({ host: 'smtp.example.test', port: 80 })).toThrow(/may not reach a real provider/);
    expect(() => net.connect(587, 'mail.example.test')).toThrow(/may not reach a real provider/);
  });

  it('removes provider keys from the test process', () => {
    const env: Record<string, string> = { MAILGUN_API_KEY: 'x', STRIPE_SECRET_KEY: 'x', OPENAI_API_KEY: 'x', MONGODB_URI: 'keep' };
    expect(scrubProviderEnv(env).sort()).toEqual(['MAILGUN_API_KEY', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY']);
    expect(env).toEqual({ MONGODB_URI: 'keep' });
    expect(process.env.MAILGUN_API_KEY).toBeUndefined();
    expect(process.env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it('leaves the site itself and local servers alone', () => {
    expect(isProviderHost('localhost')).toBe(false);
    expect(isProviderHost('egypt-excursionsonline.com')).toBe(false);
    expect(isProviderHost('api.mailgun.net')).toBe(true);
  });
});
