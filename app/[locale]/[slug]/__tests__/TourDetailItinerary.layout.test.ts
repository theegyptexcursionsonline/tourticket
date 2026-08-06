import fs from 'node:fs';
import path from 'node:path';

describe('tour detail itinerary layout', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'app/[locale]/[slug]/TourDetailClientPage.tsx'),
    'utf8',
  );

  it('keeps every itinerary stop in the document scroll', () => {
    expect(source).not.toContain('max-h-[600px] lg:max-h-[700px] overflow-y-auto');
    expect(source).toContain('<div className="pr-1 sm:pr-2">');
  });

  it('bounds the sticky map to the full itinerary grid and avoids image letterboxing', () => {
    expect(source).toContain("items-start gap-6`}");
    expect(source).toContain('lg:sticky lg:top-24 lg:self-start');
    expect(source).toContain('aspect-square w-full');
    expect(source).toContain('className="h-full w-full object-cover"');
  });
});
