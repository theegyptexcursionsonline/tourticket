import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

// Opening or refreshing checkout used to send a customer with a full cart back
// to the home page: the page saw the cart before it was restored and read
// "empty" as "nothing to pay for". The provider's readiness is covered in
// contexts/__tests__/CartReadiness.test.tsx; this pins how checkout uses it.
describe('checkout waits for the restored cart', () => {
  const checkout = source('app/[locale]/checkout/page.tsx');

  it('leaves for the home page only once the cart is known to be empty', () => {
    expect(checkout).toContain('const { cart, clearCart, isCartReady } = useCart();');
    expect(checkout).toMatch(/if \(isCartReady && cart && cart\.length === 0 && !isConfirmed\) \{\s*router\.push\('\/'\);/);
    expect(checkout).not.toMatch(/if \(cart && cart\.length === 0 && !isConfirmed\) \{\s*router\.push/);
  });

  it('shows the loading state, not an empty form, until the cart is restored', () => {
    expect(checkout).toContain('if (!cart || (!isCartReady && !isConfirmed)) {');
    expect(checkout).toContain('Loading your booking...');
  });

  it('keeps the thank-you page reachable after the cart is cleared on payment', () => {
    // The confirmation clears the cart; readiness must not hide it.
    expect(checkout).toContain('(!isCartReady && !isConfirmed)');
    expect(checkout).toContain('<ThankYouPage');
  });
});
