/**
 * @jest-environment node
 */

// Read the policy the storefront actually serves, not the config source text:
// a wallet can only run in Stripe's payment frames when this header grants
// their origin the payment feature.
async function servedPermissionsPolicy(): Promise<Map<string, string>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('../next.config');
  const routes: Array<{ source: string; headers: Array<{ key: string; value: string }> }> = await config.headers();
  const everyPage = routes.find((route) => route.source === '/(.*)');
  const header = everyPage?.headers.find((item) => item.key === 'Permissions-Policy');
  if (!header) throw new Error('Permissions-Policy is not served on every page');
  return new Map(header.value.split(/,\s*/).map((directive) => {
    const separator = directive.indexOf('=');
    return [directive.slice(0, separator).trim(), directive.slice(separator + 1).trim()] as [string, string];
  }));
}

describe('storefront Permissions-Policy', () => {
  it('lets Stripe payment frames offer Apple Pay and Google Pay', async () => {
    const policy = await servedPermissionsPolicy();
    expect(policy.get('payment')).toBe('(self "https://js.stripe.com")');
  });

  it('grants payment to no other origin and leaves the other features unchanged', async () => {
    const policy = await servedPermissionsPolicy();
    expect(policy.get('payment')).not.toContain('*');
    expect(policy.get('camera')).toBe('()');
    expect(policy.get('microphone')).toBe('(self "https://voice.foxestechnology.com")');
    expect(policy.get('geolocation')).toBe('(self)');
    expect([...policy.keys()].sort()).toEqual(['camera', 'geolocation', 'microphone', 'payment']);
  });
});
