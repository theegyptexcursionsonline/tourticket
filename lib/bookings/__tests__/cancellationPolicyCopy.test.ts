import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CANCELLATION_POLICY_SHORT,
  CANCELLATION_POLICY_SUMMARY,
} from '@/lib/bookings/cancellationPolicy';

const publicPolicyFiles = [
  'app/[locale]/terms/TermsClientPage.tsx',
  'app/[locale]/user/bookings/[id]/page.tsx',
  'app/[locale]/HomePageServer.tsx',
  'app/[locale]/about/page.tsx',
  'app/[locale]/faqs/layout.tsx',
  'app/[locale]/faqs/FAQsClientPage.tsx',
  'app/[locale]/categories/[slug]/CategoryPageClient.tsx',
  'app/[locale]/destinations/[slug]/DestinationPageClient.tsx',
  'app/[locale]/[slug]/TourDetailClientPage.tsx',
  'components/TourDetailPage.tsx',
  'components/BookingSidebar.tsx',
  'components/MobileBookingDrawer.tsx',
  'lib/data/tours.ts',
  'messages/en.json',
  'messages/es.json',
  'messages/fr.json',
  'messages/de.json',
  'messages/ar.json',
];

describe('cancellation policy copy gate', () => {
  it('keeps the canonical policy explicit and complete', () => {
    expect(CANCELLATION_POLICY_SUMMARY).toContain('24 hours');
    expect(CANCELLATION_POLICY_SHORT).toContain('100%');
    expect(CANCELLATION_POLICY_SHORT).toContain('50%');
    expect(CANCELLATION_POLICY_SHORT).toContain('7+ days');
    expect(CANCELLATION_POLICY_SHORT).toContain('3–7 days');
  });

  it.each(publicPolicyFiles)('%s does not reintroduce a contradictory legacy promise', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).not.toMatch(/free cancellation/i);
    expect(source).not.toMatch(/\b(?:4 days|8 hours|48 hours)\b/i);
    expect(source).not.toMatch(/24 hours[^.\n]{0,100}full refund/i);
  });

  it('keeps Terms tied directly to the canonical policy module and exact tiers', () => {
    const terms = readFileSync(resolve(process.cwd(), 'app/[locale]/terms/TermsClientPage.tsx'), 'utf8');
    expect(terms).toContain('CANCELLATION_POLICY_SUMMARY');
    expect(terms).toContain('7 or more days before departure');
    expect(terms).toContain('3 to 7 days before departure');
    expect(terms).toContain('Less than 3 days before departure');
  });
});
