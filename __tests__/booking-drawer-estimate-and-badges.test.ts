export {};
// Two defects fixed on the sibling MT network and ported back here.
const fs = require('fs');
const path = require('path');
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('booking drawer money display', () => {
  it('estimates the running total from the cheapest bookable option, not the tour per-guest price', () => {
    const src = read('components/BookingSidebar.tsx');
    // Before a departure is chosen the footer used tourBasePricing per guest,
    // which contradicts a whole-unit option card (a per-head total shown beside
    // a one-unit price).
    expect(src).toContain('const estimate = (availability?.tourOptions ?? [])');
    expect(src).toMatch(/\.filter\(\(candidate\) => capacityAvailability\(candidate, party\)\.available\)/);
    expect(src).toContain('unitCount(party, effectiveUnitSize(candidate))');
    // The estimate must be able to flip the totals to unit pricing.
    expect(src).toMatch(/if \(estimate\.unitPriced\) \{\s*\n\s*optionIsUnitPriced = true;/);
  });

  it('never renders a bare zero where a discount or original price is absent', () => {
    const src = read('components/BookingSidebar.tsx');
    // `{n && <jsx/>}` prints "0" when n is 0 — it put a stray 0 on every option
    // card whose discount was unset.
    expect(src).not.toMatch(/\{option\.discount && option\.discount > 0 && \(/);
    expect(src).not.toMatch(/\{addOn\.originalPrice && /);
    expect(src).toContain('Boolean(option.discount && option.discount > 0)');
  });
});

describe('Empty trash refuses records other content still points at', () => {
  it('checks page and city references, not just tours and blogs', () => {
    const src = read('lib/admin/emptyTrash.ts');
    expect(src).toContain('AttractionPage.countDocuments({ $or: [{ categoryId: doc._id }, { linkedCategoryIds: doc._id }] })');
    expect(src).toContain('AttractionPage.countDocuments({ cityDestination: doc._id })');
    expect(src).toContain('async function inspectPage(');
    expect(src).toMatch(/page: inspectPage,/);
  });
});
