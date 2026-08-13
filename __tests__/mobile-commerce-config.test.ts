import {readFileSync} from 'node:fs';
import {join} from 'node:path';

describe('mobile commerce deployment configuration', () => {
  it('includes the private bridge token in Netlify function environments', () => {
    const config = readFileSync(join(process.cwd(), 'netlify.toml'), 'utf8');

    expect(config).toMatch(/"MOBILE_COMMERCE_SERVICE_TOKEN"/);
    expect(config).toMatch(/"MOBILE_COMMERCE_STRIPE_SECRET_KEY"/);
  });

  it('prefers the isolated mobile Stripe verifier without removing the web fallback', () => {
    const source = readFileSync(join(process.cwd(), 'lib/checkout/mobileCommerce.ts'), 'utf8');

    expect(source).toMatch(
      /process\.env\.MOBILE_COMMERCE_STRIPE_SECRET_KEY\s*\|\|\s*process\.env\.STRIPE_SECRET_KEY/,
    );
  });
});
