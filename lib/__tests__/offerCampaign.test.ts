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
    expect(Object.keys(CITY_CATALOG)).toHaveLength(5);
  });
});
