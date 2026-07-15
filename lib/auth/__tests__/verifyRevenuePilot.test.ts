import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { claimRevenueNonce, revenueBodyHash, revenueCanonicalRequest, validateRevenuePilotSignature } from '@/lib/auth/verifyRevenuePilot';
import RevenueMachineNonce from '@/lib/models/RevenueMachineNonce';

jest.mock('@/lib/models/RevenueMachineNonce', () => ({ __esModule: true, default: { create: jest.fn() } }));
jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));

describe('RevenuePilot machine signature contract', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const signedRequest = (scope = 'read', signatureOverride?: string) => {
    process.env.REVENUEPILOT_HMAC_KEYS = `primary:${secret}`;
    process.env.REVENUEPILOT_HMAC_SCOPES = `primary=${scope}`;
    const timestamp = String(Date.now());
    const nonce = `nonce-${Math.random()}`;
    const body = '{"a":1}';
    const path = '/api/v1/revenue/catalog?x=1';
    const canonical = [timestamp, nonce, 'POST', path, revenueBodyHash(body)].join('\n');
    const signature = signatureOverride ?? createHmac('sha256', secret).update(canonical).digest('hex');
    return { request: { method: 'POST', nextUrl: { pathname: '/api/v1/revenue/catalog', search: '?x=1' }, headers: new Headers({ 'x-rp-key-id': 'primary', 'x-rp-timestamp': timestamp, 'x-rp-nonce': nonce, 'x-rp-signature': signature }) } as NextRequest, body };
  };

  beforeEach(() => jest.mocked(RevenueMachineNonce.create).mockResolvedValue({} as any));

  it('hashes the exact body and signs the query-bearing path', () => {
    const request = { method: 'POST', nextUrl: { pathname: '/api/v1/revenue/prices/apply', search: '?dry=0' } } as any;
    expect(revenueBodyHash('{"a":1}')).toMatch(/^[a-f0-9]{64}$/);
    expect(revenueCanonicalRequest(request, '1000', 'nonce', '{"a":1}')).toBe(`1000\nnonce\nPOST\n/api/v1/revenue/prices/apply?dry=0\n${revenueBodyHash('{"a":1}')}`);
  });

  it('accepts a valid signed request with the required scope', async () => {
    const { request, body } = signedRequest('read|write');
    expect(validateRevenuePilotSignature(request, body, 'write')).toMatchObject({ ok: true, keyId: 'primary' });
  });

  it('rejects invalid signatures and missing scopes', async () => {
    const invalid = signedRequest('read', '0'.repeat(64));
    expect(validateRevenuePilotSignature(invalid.request, invalid.body)).toMatchObject({ ok: false, status: 401 });
    const scoped = signedRequest('read');
    expect(validateRevenuePilotSignature(scoped.request, scoped.body, 'write')).toMatchObject({ ok: false, status: 403 });
  });

  it('rejects an otherwise valid signature outside the five-minute clock window', () => {
    const { request, body } = signedRequest('read');
    const timestamp = String(Date.now() - (5 * 60 * 1000) - 1);
    const nonce = request.headers.get('x-rp-nonce')!;
    const canonical = [timestamp, nonce, 'POST', '/api/v1/revenue/catalog?x=1', revenueBodyHash(body)].join('\n');
    request.headers.set('x-rp-timestamp', timestamp);
    request.headers.set('x-rp-signature', createHmac('sha256', secret).update(canonical).digest('hex'));
    expect(validateRevenuePilotSignature(request, body)).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects a reused nonce', async () => {
    jest.mocked(RevenueMachineNonce.create).mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }));
    expect(await claimRevenueNonce('primary', 'reused')).toBe(false);
  });
});
