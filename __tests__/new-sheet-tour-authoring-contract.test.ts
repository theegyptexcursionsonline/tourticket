import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('15-16 August tour authoring regressions', () => {
  const form = read('components/TourForm.tsx');
  const sidebar = read('components/BookingSidebar.tsx');
  const pages = read('app/admin/pages/page.tsx');
  const clientDetail = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
  const model = read('lib/models/Tour.ts');

  it('defaults new bookings to one adult', () => {
    expect(sidebar).not.toContain('adults: 2');
    expect((sidebar.match(/adults: 1/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps long booking options fully reachable', () => {
    expect(form).not.toContain("max-h-[2000px] opacity-100");
    expect(form).toContain("expandedOptionIndex === index ? 'opacity-100' : 'hidden'");
  });

  it('stores title-only itinerary steps with an empty description', () => {
    expect(form).toContain('.filter((item: ItineraryItem) => item.title?.trim())');
    expect(form).toContain("description: item.description?.trim() || ''");
    const itinerarySchema = model.slice(model.indexOf('const ItineraryItemSchema'), model.indexOf('const AvailabilitySlotSchema'));
    expect(itinerarySchema).toContain("description: { type: String, trim: true, default: '' }");
    expect(itinerarySchema).not.toMatch(/description:.*required: true/);
  });

  it('removes the URL column without removing preview links', () => {
    expect(pages).not.toContain('>URL</th>');
    expect(pages).not.toContain('{row.publicPath}</span>');
    expect(pages).toContain('storefrontPreviewUrl(row.publicPath');
  });

  it('lets the explicit max group size override stale legacy group data', () => {
    expect(clientDetail).toContain('max: tour.maxGroupSize || tour.groupSize?.max || 20');
  });

  it('offers adult, child and infant slot prices in both pricing sections', () => {
    expect(form).toContain('Adult price (optional)');
    expect(form).toContain("(['child', 'infant'] as const).map((guest)");
    expect(form).toContain('handleBookingOptionSlotGuestPrice');
  });
});
