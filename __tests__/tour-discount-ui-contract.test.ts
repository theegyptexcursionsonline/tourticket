import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('tour percentage discount UI contract', () => {
  it('uses Base Price plus Discount percentage without an editable Original Price', () => {
    const form = read('components/TourForm.tsx');

    expect(form).toContain('Automatically applies to the Base Price and universal slot prices');
    expect(form).toContain('data-testid="discounted-base-price-preview"');
    expect(form).not.toContain('name="originalPrice"');
    expect(form).not.toContain('>Original Price (');
  });

  it('shows the actual discount and original amount beside every reduced time slot', () => {
    const sidebar = read('components/BookingSidebar.tsx');

    expect(sidebar).toContain('const slotDiscount = percentageOff(timeSlot.originalPrice, timeSlot.price)');
    expect(sidebar).toContain('{slotDiscount}% off');
    expect(sidebar).toContain('formatPrice(timeSlot.originalPrice!)');
  });
});
