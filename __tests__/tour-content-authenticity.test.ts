import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const TOUR_PAGE = 'app/[locale]/[slug]/TourDetailClientPage.tsx';
const CATEGORY_PAGE = 'app/[locale]/categories/[slug]/CategoryPageClient.tsx';
const DESTINATION_PAGE = 'app/[locale]/destinations/[slug]/DestinationPageClient.tsx';

// Phrases that were previously published on the operator's behalf when an
// admin left a field empty. Several made commercial promises (refunds,
// cancellation terms, hotel pickup) that no operator had agreed to.
const INVENTED_COPY = [
  'Tours operate rain or shine',
  'Gratuities are not included',
  'No meals included unless specified',
  'Photography is encouraged',
  'Moderate walking required',
  'Limited wheelchair accessibility',
  'Enhanced safety protocols in place',
  'Learn about local history and culture',
  'Arrive at meeting point 15 minutes early',
  'Tour experience may vary by season',
  'Meeting point instructions will be provided',
  'No refunds are provided for missed departures',
  'bookings can be rescheduled up to 24 hours',
  'Children 4-13 receive discounted pricing',
];

describe('tour detail page publishes only operator-entered content', () => {
  it('carries no canned fallback copy', () => {
    const source = read(TOUR_PAGE);
    for (const phrase of INVENTED_COPY) {
      expect(source).not.toContain(phrase);
    }
  });

  it('hides each supplementary section when its fields are empty', () => {
    const source = read(TOUR_PAGE);
    for (const guard of [
      'const PracticalInfoSection',
      'const AccessibilitySection',
      'const PoliciesSection',
      'const CulturalSection',
    ]) {
      const start = source.indexOf(guard);
      expect(start).toBeGreaterThanOrEqual(0);
      // every section returns null before rendering a heading with no content
      expect(source.slice(start, start + 1200)).toContain('return null');
    }
  });

  it('drops the FAQ section rather than answering for the operator', () => {
    const source = read(TOUR_PAGE);
    const start = source.indexOf('const EnhancedFAQ');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(source.slice(start, start + 600)).toContain('return null');
  });

  it('only offers a tab for a section that will render', () => {
    const source = read(TOUR_PAGE);
    const start = source.indexOf('const tabs = [');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = source.indexOf('.filter((tab) => tab.show)', start);
    expect(end).toBeGreaterThan(start);
    const block = source.slice(start, end);
    for (const id of ['practical', 'accessibility', 'policies', 'cultural', 'faq']) {
      expect(block).toContain(`id: '${id}'`);
    }
  });
});

describe('category page publishes only operator-entered content', () => {
  it('makes no cancellation, pickup, rating or traveller-volume claims', () => {
    const source = read(CATEGORY_PAGE);
    for (const phrase of [
      'no refund under 3 days',
      'Pickup and drop-off from your hotel',
      '4.8/5',
      '50K+',
      'Clear cancellation policy',
    ]) {
      expect(source).not.toContain(phrase);
    }
  });
});

describe('destination page publishes only sourced statistics', () => {
  it('contains no fabricated rating, traveler, review or support totals', () => {
    const source = read(DESTINATION_PAGE);
    for (const phrase of [
      '50K+',
      '50,000+',
      '4.8/5',
      '1,000+ reviews',
      '24/7 if you need assistance',
      '+50 ألف',
    ]) {
      expect(source).not.toContain(phrase);
    }
  });

  it('derives review summary values from the rendered review records', () => {
    const source = read(DESTINATION_PAGE);
    expect(source).toContain('reviews.reduce((total, review) => total + review.rating, 0) / reviews.length');
    expect(source).toContain('copy.reviewsSummary(averageRating, reviews.length)');
  });
});
