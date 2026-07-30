import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('itinerary editor exposes every field the storefront renders', () => {
  const form = read('components/TourForm.tsx');
  const page = read('app/[locale]/[slug]/TourDetailClientPage.tsx');

  it.each(['time', 'duration', 'location'])('edits itinerary %s', (field) => {
    expect(form).toContain(`handleItineraryChange(i, '${field}', e.target.value)`);
  });

  it('edits the includes list as one entry per line', () => {
    expect(form).toContain('handleItineraryIncludesChange(i, e.target.value)');
    expect(form).toContain("includes: value.split('\\n').map((line) => line.trim()).filter(Boolean)");
  });

  it('labels each stop by its own title rather than a repeated day number', () => {
    const start = form.indexOf('toggleItineraryItem(i)');
    expect(start).toBeGreaterThanOrEqual(0);
    const header = form.slice(start, start + 900);
    expect(header).toContain('day.title?.trim() || `Stop ${i + 1}`');
    expect(header).not.toContain('Day {day.day}');
  });

  it('covers the itinerary fields the tour page reads', () => {
    for (const field of ['item.time', 'item.duration', 'item.location', 'item.includes']) {
      expect(page).toContain(field);
    }
  });
});
