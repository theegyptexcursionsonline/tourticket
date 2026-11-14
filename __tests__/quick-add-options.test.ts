import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

// "Quick Add to Cart" put the tour in the cart for today, at "Anytime", with no
// option, priced at the tour's headline figure. For a tour sold through options
// that line has no real price or departure, so the server now refuses it
// (lib/checkout/__tests__/serverCartPricing.test.ts) and the button opens the
// booking panel instead.
describe('quick add on a tour sold through options', () => {
  const page = source('app/[locale]/[slug]/TourDetailClientPage.tsx');
  const handler = page.slice(page.indexOf('const handleQuickAdd = async () => {'));

  it('opens the booking panel before anything is added to the cart', () => {
    const guard = handler.indexOf('if (Array.isArray(tour.bookingOptions) && tour.bookingOptions.length > 0) {');
    const opens = handler.indexOf('setBookingSidebarOpen(true);');
    const adds = handler.indexOf('addToCart(quickAddCartItem);');
    expect(guard).toBeGreaterThan(-1);
    expect(opens).toBeGreaterThan(guard);
    expect(adds).toBeGreaterThan(opens);
    expect(handler.slice(guard, adds)).toMatch(/setBookingSidebarOpen\(true\);\s*return;/);
  });

  it('tells the customer what to do when an old cart line reaches payment', () => {
    const pricing = source('lib/checkout/serverCartPricing.ts');
    expect(pricing).toContain('Choose an option and a departure time for this tour, then add it to your cart again.');
    expect(pricing).toContain("code = 'BOOKING_OPTION_REQUIRED';");
  });
});
