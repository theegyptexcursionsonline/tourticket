import fs from 'fs';
import path from 'path';

const source = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('main storefront security regressions', () => {
  it('does not bind receipt authorization to a customer database id', () => {
    const checkout = source('app/api/checkout/route.ts');
    const receipt = source('app/api/checkout/receipt/route.ts');
    expect(checkout).not.toContain("sub: String(user._id)");
    expect(receipt).toContain('payload.sub !== `receipt:${payload.paymentId}`');
    expect(receipt).not.toContain('user: String(payload.sub)');
  });

  it('does not trust browser identity fields during Firebase synchronization', () => {
    const route = source('app/api/auth/firebase/sync/route.ts');
    expect(route).toContain('getFirebaseUser(verifyResult.uid)');
    expect(route).not.toContain('const { uid, email, displayName, photoURL, emailVerified');
  });

  it('keeps public catalogue APIs published and default-tenant scoped', () => {
    for (const file of ['app/api/tours/list/route.ts', 'app/api/search/live/route.ts']) {
      const route = source(file);
      expect(route).toContain('isPublished: true');
      expect(route).toContain("tenantId: 'default'");
    }
  });

  it('does not report an arbitrary checkout session as paid', () => {
    const checkout = source('app/api/checkout/route.ts');
    expect(checkout).not.toContain("payment_status: 'paid'");
    expect(checkout).toContain("status: 405");
  });
});
