import { publicCheckoutOrigin } from '@/lib/checkout/publicCheckoutOrigin';

describe('public checkout origin', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('uses the configured canonical HTTPS origin and strips paths', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://egypt-excursionsonline.com/some/path';
    expect(publicCheckoutOrigin()).toBe('https://egypt-excursionsonline.com');
  });

  it('does not trust credential-bearing or insecure production origins', () => {
    process.env = { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://user:pass@example.com' };
    expect(() => publicCheckoutOrigin()).toThrow(/credential-free HTTPS origin/);
  });

  it('permits localhost HTTP only outside production', () => {
    process.env = { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000' };
    expect(publicCheckoutOrigin()).toBe('http://127.0.0.1:3000');
  });
});
