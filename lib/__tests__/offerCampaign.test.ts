import {
  CITY_CATALOG,
  cityFromParam,
  clampOfferEnd,
  looksLikeCampaignCode,
  sanitizeOfferName,
  tourDisplayPricing,
} from '@/lib/offer/campaign';

describe('campaign links on EEO main', () => {
  it('accepts bare codes and rejects slugs/tokens', () => {
    expect(looksLikeCampaignCode('EEO15')).toBe(true);
    expect(looksLikeCampaignCode('eeo15')).toBe(true);
    expect(looksLikeCampaignCode('amira-7zrs')).toBe(false);
    expect(looksLikeCampaignCode('a.b')).toBe(false);
    expect(looksLikeCampaignCode('ab')).toBe(false);
  });

  it('sanitizes names to display-safe text', () => {
    expect(sanitizeOfferName('sara')).toBe('Sara');
    expect(sanitizeOfferName('<script>alert(1)</script>')).toBe('Alert');
    expect(sanitizeOfferName('%%%')).toBeNull();
    expect(sanitizeOfferName('x'.repeat(60))!.length).toBeLessThanOrEqual(24);
  });

  it('clamps a URL end date to the code expiry and ignores the past', () => {
    const now = new Date('2026-08-13T12:00:00Z');
    const codeEnd = new Date('2026-08-20T23:59:59Z');
    expect(clampOfferEnd('2026-08-15', codeEnd, now)!.toISOString()).toBe('2026-08-15T23:59:59.000Z');
    expect(clampOfferEnd('2026-12-31', codeEnd, now)!.toISOString()).toBe(codeEnd.toISOString());
    expect(clampOfferEnd('2026-08-01', codeEnd, now)!.toISOString()).toBe(codeEnd.toISOString());
    expect(clampOfferEnd(undefined, null, now)).toBeNull();
  });
});

describe('display pricing honesty', () => {
  it('shows per-tour discounted prices for percentage codes', () => {
    const p = tourDisplayPricing(40, { discountType: 'percentage', value: 15 });
    expect(p).toEqual({ offerPrice: 34, saving: 6, perTourDiscount: true });
  });

  it('never invents a per-tour price for a fixed code (it applies once per cart)', () => {
    const p = tourDisplayPricing(40, { discountType: 'fixed', value: 10 });
    expect(p).toEqual({ offerPrice: 40, saving: 0, perTourDiscount: false });
  });

  it('caps a runaway percentage at 100', () => {
    const p = tourDisplayPricing(40, { discountType: 'percentage', value: 250 });
    expect(p.offerPrice).toBe(0);
  });
});

describe('city catalogue', () => {
  it('maps every city to its old and new destination slugs', () => {
    expect(cityFromParam('sharm-el-sheikh')!.slugs).toContain('sharm-el-sheikh-old');
    expect(cityFromParam('hurghada')!.slugs).toContain('hurghada-egypt');
    expect(cityFromParam('cairo')!.slugs).toEqual(expect.arrayContaining(['cairo-old', 'giza']));
    expect(cityFromParam('CAIRO')!.label).toBe('Cairo & Giza');
    expect(cityFromParam('atlantis')).toBeNull();
    expect(Object.keys(CITY_CATALOG)).toHaveLength(6);
  });

  it("serves the client's four campaign cities, Makadi Bay included (14/08)", () => {
    // "I need on this domain 4 landing page one per city
    //  (Hurghada - Cairo - Makadi Bay - Sharm El sheikh)".
    for (const city of ['hurghada', 'cairo', 'makadi-bay', 'sharm-el-sheikh']) {
      expect(cityFromParam(city)).not.toBeNull();
    }
    expect(cityFromParam('makadi-bay')!.label).toBe('Makadi Bay');
    expect(cityFromParam('makadi-bay')!.slugs).toEqual(
      expect.arrayContaining(['makadi-bay', 'makadi-bay-old']),
    );
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Shimmer + exit rescue: honest, accessible, once per session. */
describe('conversion mechanics', () => {
  const client = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/OfferPageClient.tsx'),
    'utf8',
  );
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

  it('ambient shimmer exists and dies under reduced motion', () => {
    expect(client).toContain('offer-sheen offer-sheen-auto');
    expect(css).toContain('@keyframes offer-sheen-loop');
    const reducedBlock = css.slice(css.lastIndexOf('prefers-reduced-motion'));
    expect(reducedBlock).toContain('.offer-sheen-auto { animation: none; }');
  });

  it('exit rescue is once-per-session, desktop-only, accessible and honest', () => {
    const rescue = client.slice(client.indexOf('function ExitRescue'));
    expect(rescue).toContain('sessionStorage.getItem(key)');
    expect(rescue).toContain("matchMedia('(pointer: fine)')");
    expect(rescue).toContain('role="dialog"');
    expect(rescue).toContain('aria-modal="true"');
    expect(rescue).toContain("event.key === 'Escape'");
    expect(rescue).not.toMatch(/\d+% claimed|only \d+ left|people are looking/i);
  });
});

/**
 * Client feedback 2026-08-14: exactly three bundle listings per offer page,
 * each with real benefit bullets rendered BEFORE the price.
 */
describe('bundle listings contract (client 14/08)', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const page = fs.readFileSync(path.join(process.cwd(), 'app/[locale]/offer/[token]/page.tsx'), 'utf8');
  const client = fs.readFileSync(path.join(process.cwd(), 'app/[locale]/offer/[token]/OfferPageClient.tsx'), 'utf8');

  it('caps the bundles section at exactly three listings', () => {
    expect(page).toContain('const BUNDLE_COUNT = 3;');
  });

  it('sources benefit bullets from real tour highlights only', () => {
    expect(page).toMatch(/\.select\('[^']*highlights[^']*'\)/);
    expect(client).toContain('benefits && tour.highlights.length > 0');
  });

  it('renders benefits before the price and only on the bundles section', () => {
    const card = client.slice(client.indexOf('function TourCard'), client.indexOf('function Heading'));
    const benefitsAt = card.indexOf('tour.highlights.map');
    const priceAt = card.indexOf('tour.offerPrice');
    expect(benefitsAt).toBeGreaterThan(-1);
    expect(priceAt).toBeGreaterThan(-1);
    expect(benefitsAt).toBeLessThan(priceAt);
    const bundleMaps = client.match(/view\.bundles\.map[\s\S]{0,240}?benefits \/>/g) || [];
    expect(bundleMaps.length).toBe(1);
    expect(client).not.toMatch(/view\.picks\.map[\s\S]{0,240}?benefits \/>/);
  });
});

/**
 * Offer pages are art-directed with fixed inline palettes, so the storefront
 * dark remap turned them into a light/dark patchwork (client report 14/08).
 * The route pins its designed look pre-paint and restores the visitor's
 * theme on exit.
 */
describe('offer route theme pin', () => {
  const fs2 = require('node:fs') as typeof import('node:fs');
  const path2 = require('node:path') as typeof import('node:path');
  const layout = fs2.readFileSync(path2.join(process.cwd(), 'app/[locale]/offer/layout.tsx'), 'utf8');
  const pin = fs2.readFileSync(path2.join(process.cwd(), 'app/[locale]/offer/theme.tsx'), 'utf8');
  const scanner = fs2.readFileSync(path2.join(process.cwd(), 'scripts/theme/scanStorefront.ts'), 'utf8');

  it('pins the designed palette before first paint on hard loads', () => {
    expect(layout).toContain("storefrontThemePin='light'");
    expect(layout).toContain('offer-theme-pin');
  });

  it('is honoured by the theme provider, whose parent effect runs last', () => {
    const provider = fs2.readFileSync(path2.join(process.cwd(), 'contexts/StorefrontThemeContext.tsx'), 'utf8');
    expect(provider).toContain('dataset.storefrontThemePin');
    expect(pin).toContain('delete root.dataset.storefrontThemePin');
  });

  it('restores the visitor saved/system theme when leaving the route', () => {
    expect(pin).toContain('STOREFRONT_THEME_STORAGE_KEY');
    expect(pin).toContain("matchMedia('(prefers-color-scheme: dark)')");
  });

  it('keeps offer-only utilities out of the generated dark map', () => {
    expect(scanner).toMatch(/EXCLUDED = .*\|offer\|/);
  });
});

/**
 * Client report 14/08 2:36 AM (log #463): the "Tap to copy" control spilled
 * past the right screen edge on a phone narrower than 390px. The proof floor
 * is now 344px — the control must be geometrically unable to overflow at any
 * viewport, whatever length the code is.
 */
describe('narrow-phone code control (log #463)', () => {
  const client = readFileSync(
    path.join(process.cwd(), 'app/[locale]/offer/[token]/OfferPageClient.tsx'),
    'utf8',
  );

  it('lets every copy control shrink and wrap instead of spilling off-screen', () => {
    // Both copy-labelled buttons: the hero panel and the exit rescue dialog.
    const buttons = client.split('Copy discount code').slice(1);
    expect(buttons.length).toBe(2);
    for (const rest of buttons) {
      const button = rest.slice(0, rest.indexOf('</button>'));
      expect(button).toContain('flex-wrap');
      expect(button).toContain('min-w-0 break-all');
      expect(button).toContain('ml-auto shrink-0');
    }
  });
});
