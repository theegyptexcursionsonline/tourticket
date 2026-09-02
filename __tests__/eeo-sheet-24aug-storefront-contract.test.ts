import { readFileSync } from 'fs';
import { join } from 'path';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/** EEO sheet "New 24 August" storefront + admin items — pinned so parity with the MT fork cannot regress silently. */
describe('EEO sheet 24 Aug — storefront and admin contracts', () => {
  const sidebar = source('components/BookingSidebar.tsx');

  it('re-measures the option description once the collapsed card is shown', () => {
    expect(sidebar).toContain('}, [option.description, expanded, descExpanded]);');
    expect(sidebar).toContain('if (!el || !expanded || descExpanded) return;');
    expect(sidebar).toContain('new ResizeObserver(measure)');
    expect(sidebar).toContain("typeof ResizeObserver === 'undefined'");
  });

  it('lets guests pick 1..N units of a per-person add-on instead of auto-multiplying', () => {
    expect(sidebar).toContain('clampAddOnQuantity(quantity, perPersonLimit)');
    expect(sidebar).toContain("t('booking.addOneAddOn', { title: addOnLabel })");
    expect(sidebar).toContain("t('booking.removeOneAddOn', { title: addOnLabel })");
    expect(sidebar).toContain("t('booking.addOnMaxPerParticipant', { count: perPersonLimit })");
    expect(sidebar).toContain('clampSelectedPerPersonAddOns(');
    expect(sidebar).toContain('addOnQuantityVersion: ADD_ON_QUANTITY_VERSION');
    expect(sidebar).toContain('aria-pressed="true"');
    expect(sidebar).toContain("t('booking.selectAddOn', { title: addOnLabel })");
    expect(sidebar).toContain("t('booking.removeAddOn', { title: addOnLabel })");
    expect(sidebar).not.toContain('addOn.perGuest ? totalGuests : quantity');
    expect(sidebar).not.toContain('addOn.perGuest ? guestCount : quantity');
    expect(sidebar).not.toContain('addOn.perGuest ? (bookingData.adults + bookingData.children) : quantity');
  });

  it('shows and totals the authored infant price on each per-person option card', () => {
    expect(sidebar).toContain('guestPricedSubtotal(cardGuestPrices, adults, childCount, infantCount)');
    expect(sidebar).toContain('Per Infant: {formatPrice(infantPrice)}');
  });

  it('shows every cart, checkout and booking surface the chosen units, not the party size', () => {
    for (const path of [
      'components/CartSidebar.tsx',
      'app/[locale]/checkout/page.tsx',
      'app/[locale]/user/bookings/[id]/page.tsx',
      'app/admin/bookings/[id]/page.tsx',
      'lib/utils/generateReceiptPdf.ts',
    ]) {
      const file = source(path);
      expect(file).not.toContain('perGuest ? totalGuests : quantity');
      expect(file).not.toContain('perGuest ? payingGuests : qtyNum');
    }
  });

  it('versions Stripe recovery so in-flight legacy payments keep their original add-on charge', () => {
    const preparation = source('lib/checkout/webCheckoutPreparation.ts');
    const webhook = source('app/api/webhooks/stripe/route.ts');
    expect(preparation).toContain('aqv: 1');
    expect(webhook).toContain('recoveryAddOnUnits(item, ao)');
  });

  it('uses a singular participant label for a party of one, in every locale', () => {
    expect(sidebar).toContain("totalGuests === 1 ? t('booking.participant') : t('booking.participants')");
    for (const locale of ['en', 'de', 'fr', 'es', 'ar']) {
      const messages = JSON.parse(source(`messages/${locale}.json`));
      expect(typeof messages.booking.participant).toBe('string');
      expect(messages.booking.participant.trim().length).toBeGreaterThan(0);
      for (const key of ['addOnQuantityLabel', 'removeOneAddOn', 'addOneAddOn', 'addOnMaxPerParticipant', 'addOnUpTo']) {
        expect(typeof messages.booking[key]).toBe('string');
        expect(messages.booking[key].trim().length).toBeGreaterThan(0);
      }
      for (const key of ['selectAddOn', 'removeAddOn']) {
        expect(typeof messages.booking[key]).toBe('string');
        expect(messages.booking[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('carries the quantity contract through guest carts, account carts, bookings, and recovery', () => {
    for (const path of [
      'contexts/CartContext.tsx',
      'app/api/user/cart/route.ts',
      'lib/models/user.ts',
      'lib/models/Booking.ts',
      'app/api/checkout/route.ts',
    ]) {
      expect(source(path)).toContain('addOnQuantityVersion');
    }
  });

  it('asks the tours API for live tours only in the destination Tour listings picker', () => {
    const manager = source('app/admin/destinations/DestinationManager.tsx');
    expect((manager.match(/\/api\/admin\/tours\?includeArchived=false/g) || []).length).toBe(2);
    expect(manager).not.toMatch(/fetch\(['`]\/api\/admin\/tours['`]/);
  });
});
