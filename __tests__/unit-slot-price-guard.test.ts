import fs from 'node:fs';
import path from 'node:path';
import { bookingOptionCapacityError, cleanBookingOptions } from '@/lib/admin/cleanBookingOptions';
import { unitSlotPriceIssue } from '@/lib/bookings/unitPricing';

// #1791: a per-person figure stored as a group slot price charged a whole
// group one member's share. Both live cases are pinned here.
describe('unit option slot prices are per unit (#1791)', () => {
  it('refuses the live horse-ride case: group of 5 at the per-person share', () => {
    const options = cleanBookingOptions([{
      type: 'Per Group', label: 'Private Large Group', price: 67.7, minCapacity: 5,
      timeSlots: [{ time: '04:00', price: 13.54 }],
    }]);
    expect(bookingOptionCapacityError(options)).toMatch(/Private Large Group: the 04:00 price 13\.54 looks like a per-person price.*whole group of 5/);
  });

  it('refuses a rounded share: group of 10 at 61.38 against 609.20', () => {
    expect(unitSlotPriceIssue({ type: 'Per Group', minCapacity: 10, price: 609.2, timeSlots: [{ time: '16:00', price: 61.38 }] }, 'Quad'))
      .toMatch(/16:00 price 61\.38/);
  });

  it('accepts the group price, a blank slot and a real time-of-day reduction', () => {
    const base = { type: 'Per Group', minCapacity: 5, price: 67.7 };
    expect(unitSlotPriceIssue({ ...base, timeSlots: [{ time: '04:00', price: 67.7 }] }, 'G')).toBeNull();
    expect(unitSlotPriceIssue({ ...base, timeSlots: [{ time: '04:00' }, { time: '05:00', price: '' }] }, 'G')).toBeNull();
    expect(unitSlotPriceIssue({ ...base, timeSlots: [{ time: '04:00', price: 40 }] }, 'G')).toBeNull();
    expect(unitSlotPriceIssue({ ...base, timeSlots: [{ time: '18:00', price: 132.57 }] }, 'G')).toBeNull();
  });

  it('applies to couples and families through their type default size', () => {
    expect(unitSlotPriceIssue({ type: 'Per Couple', price: 100, timeSlots: [{ time: '09:00', price: 50 }] }, 'Couple'))
      .toMatch(/whole couple of 2/);
    expect(unitSlotPriceIssue({ type: 'Per Family', price: 200, timeSlots: [{ time: '09:00', price: 50 }] }, 'Family'))
      .toMatch(/whole family of 4/);
  });

  it('leaves per-person options, legacy groups without a size and unpriced options alone', () => {
    expect(unitSlotPriceIssue({ type: 'Per Person', price: 100, timeSlots: [{ time: '09:00', price: 1 }] }, 'P')).toBeNull();
    expect(unitSlotPriceIssue({ type: 'Per Group', price: 100, timeSlots: [{ time: '09:00', price: 1 }] }, 'Legacy')).toBeNull();
    expect(unitSlotPriceIssue({ type: 'Per Group', minCapacity: 5, price: 0, timeSlots: [{ time: '09:00', price: 30 }] }, 'Z')).toBeNull();
  });

  it('is enforced on every admin write path and mirrored in the Tour Editor', () => {
    const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    for (const route of ['app/api/admin/tours/route.ts', 'app/api/admin/tours/[id]/route.ts', 'app/api/tours/[tourId]/booking-options/route.ts']) {
      expect(read(route)).toMatch(/bookingOptionCapacityError\(/);
    }
    const form = read('components/TourForm.tsx');
    expect(form).toMatch(/unitSlotPriceIssue\(/);
    expect(form).toMatch(/Price per \$\{/);
    expect(form).toMatch(/!isUnitPricedType\(option\.type\) && \(\['child', 'infant'\]/);
  });
});
