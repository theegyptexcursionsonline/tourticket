/**
 * @jest-environment node
 *
 * The proxy runs as Netlify's edge function, the only place that still sees the visitor's
 * connection. Every request it passes on to the server must carry its signed word for the
 * visitor (lib/security/visitorAddress.ts), and never a copy the request arrived with.
 */
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

// next-intl ships ESM that this Jest setup does not transform (pnpm's strict layout puts it
// under node_modules/.pnpm). This stand-in does exactly what next-intl 4's pass-through does
// (dist/esm/development/middleware/middleware.js, next()): forward a copy of the headers of
// the request it is given, plus its locale header.
jest.mock('next-intl/middleware', () => {
  const { NextResponse } = jest.requireActual('next/server');
  return {
    __esModule: true,
    default: () => (incoming: NextRequest) => {
      const headers = new Headers(incoming.headers);
      headers.set('X-NEXT-INTL-LOCALE', incoming.nextUrl.pathname.split('/')[1] || 'en');
      return NextResponse.next({ request: { headers } });
    },
  };
});
import { EDGE_VISITOR_HEADER } from '@/lib/security/visitorAddress';
import { vouchedVisitor } from '@/lib/security/requestVisitor';

const SECRET = 'unit-test-proxy-visitor-secret-at-least-32-chars';
const CLOUDFLARE_EDGE = '162.158.12.7';

type NetlifyGlobal = { Netlify?: { context?: { ip?: string } } };

function onNetlifyEdge(ip: string | undefined) {
  (globalThis as NetlifyGlobal).Netlify = { context: ip === undefined ? {} : { ip } };
}

const forwardedWord = (response: Response) => response.headers.get(`x-middleware-request-${EDGE_VISITOR_HEADER}`);
const forwardedNames = (response: Response) =>
  (response.headers.get('x-middleware-override-headers') || '').split(',').filter(Boolean);

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const adminSession = `${base64Url({ alg: 'HS256' })}.${base64Url({
  sub: 'a'.repeat(24),
  scope: 'admin',
  exp: Math.floor(Date.now() / 1000) + 3600,
})}.c2lnbmF0dXJl`;

function request(url: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  // As Netlify hands it over: the Host header names the site requested.
  const headers = { host: new URL(url).host, 'user-agent': 'Mozilla/5.0 (test)', ...init.headers };
  return new NextRequest(url, { method: init.method || 'GET', headers });
}

describe('the edge vouches for the visitor on every request it passes on', () => {
  const originalSecrets = {
    ABUSE_LIMIT_HASH_SECRET: process.env.ABUSE_LIMIT_HASH_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    process.env.ABUSE_LIMIT_HASH_SECRET = SECRET;
    delete process.env.JWT_SECRET;
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalSecrets)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    delete (globalThis as NetlifyGlobal).Netlify;
    warn.mockRestore();
    error.mockRestore();
  });

  it("names the visitor behind Cloudflare on an API request, from Cloudflare's own header", async () => {
    onNetlifyEdge(CLOUDFLARE_EDGE);
    const response = await proxy(request('https://egypt-excursionsonline.com/api/discounts/verify', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.7', 'content-type': 'application/json' },
    }));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '198.51.100.7', via: 'cf' });
    // The request otherwise reaches the route as it arrived.
    expect(response.headers.get('x-middleware-request-content-type')).toBe('application/json');
  });

  it('names the connection itself when the Netlify address is called directly with a forged Cloudflare header', async () => {
    onNetlifyEdge('203.0.113.5');
    const response = await proxy(request('https://egypt-excursionsonline-frankfurt.netlify.app/api/discounts/verify', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '198.51.100.7', 'x-forwarded-for': '198.51.100.8' },
    }));

    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
  });

  it('replaces a word the request arrived with, never forwarding the copy', async () => {
    onNetlifyEdge('203.0.113.5');
    const forged = `v1;${Math.floor(Date.now() / 1000)};peer;198.51.100.66;${'0'.repeat(64)}`;
    const response = await proxy(request('https://egypt-excursionsonline.com/api/auth/login', {
      method: 'POST',
      headers: { [EDGE_VISITOR_HEADER]: forged },
    }));

    expect(forwardedWord(response)).not.toBe(forged);
    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
  });

  it('vouches on dashboard rewrites and on the data-free sign-in screen', async () => {
    onNetlifyEdge('203.0.113.5');
    const signedIn = await proxy(request('https://dashboard2.egypt-excursionsonline.com/blog', {
      headers: { cookie: `authToken=${adminSession}` },
    }));
    const anonymous = await proxy(request('https://dashboard2.egypt-excursionsonline.com/blog'));

    expect(signedIn.headers.get('x-middleware-rewrite')).toBe('https://dashboard2.egypt-excursionsonline.com/admin/blog');
    expect(vouchedVisitor(forwardedWord(signedIn), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
    expect(anonymous.headers.get('x-middleware-rewrite')).toBe('https://dashboard2.egypt-excursionsonline.com/admin/sign-in');
    expect(anonymous.headers.get('cache-control')).toBe('private, no-store');
    expect(vouchedVisitor(forwardedWord(anonymous), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
  });

  it('vouches on storefront pages routed through the locale middleware', async () => {
    onNetlifyEdge(CLOUDFLARE_EDGE);
    const response = await proxy(request('https://egypt-excursionsonline.com/de/contact', {
      headers: { 'cf-connecting-ip': '198.51.100.7' },
    }));

    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '198.51.100.7', via: 'cf' });
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('de');
  });

  it('uses the configured JWT signing fallback when the dedicated secret is absent', async () => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
    process.env.JWT_SECRET = SECRET;
    onNetlifyEdge('203.0.113.5');
    const response = await proxy(request('https://egypt-excursionsonline.com/api/discounts/verify', {
      method: 'POST',
    }));
    expect(vouchedVisitor(forwardedWord(response), SECRET)).toEqual({ address: '203.0.113.5', via: 'peer' });
  });

  it('forwards no word at all without the secret, stripping the copy, and says so once', async () => {
    delete process.env.ABUSE_LIMIT_HASH_SECRET;
    onNetlifyEdge('203.0.113.5');
    const forged = `v1;${Math.floor(Date.now() / 1000)};peer;198.51.100.66;${'0'.repeat(64)}`;
    const first = await proxy(request('https://egypt-excursionsonline.com/api/discounts/verify', {
      method: 'POST',
      headers: { [EDGE_VISITOR_HEADER]: forged },
    }));
    await proxy(request('https://egypt-excursionsonline.com/api/discounts/verify', { method: 'POST' }));

    expect(forwardedWord(first)).toBeNull();
    // The request headers are still overridden, so the arrived copy is dropped.
    expect(forwardedNames(first)).not.toContain(EDGE_VISITOR_HEADER);
    expect(forwardedNames(first).length).toBeGreaterThan(0);
    const messages = error.mock.calls.map((call) => String(call[0]));
    expect(messages.filter((message) => message.includes('cannot vouch'))).toHaveLength(1);
    expect(messages.join('\n')).not.toContain('203.0.113.5');
  });

  it('forwards nothing on a redirect, which never reaches the server', async () => {
    onNetlifyEdge('203.0.113.5');
    const response = await proxy(request('https://egypt-excursionsonline.com/tours/example-tour'));

    expect(response.status).toBe(308);
    expect(forwardedWord(response)).toBeNull();
  });

  it('runs off Netlify (a local run) without a word or a warning', async () => {
    const response = await proxy(request('http://localhost:3000/api/discounts/verify', { method: 'POST' }));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(forwardedWord(response)).toBeNull();
    expect(error).not.toHaveBeenCalled();
  });
});
