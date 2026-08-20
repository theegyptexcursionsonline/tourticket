import fs from 'node:fs';
import path from 'node:path';
import { bookingOptionCapacityError, cleanBookingOptions } from '@/lib/admin/cleanBookingOptions';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('admin capacity normalization (client sheet 2026-08-20)', () => {
  it('numifies authored capacities and drops blanks', () => {
    const [option] = cleanBookingOptions([{ type: 'Per Group', label: 'G', minCapacity: '5', maxCapacity: '' }]);
    expect(option.minCapacity).toBe(5);
    expect(option).not.toHaveProperty('maxCapacity');
  });

  it('defaults Per Couple to 2 and Per Family to 4 when blank', () => {
    const [couple] = cleanBookingOptions([{ type: 'Per Couple', label: 'C' }]);
    const [family] = cleanBookingOptions([{ type: 'Per Family', label: 'F' }]);
    expect(couple.minCapacity).toBe(2);
    expect(family.minCapacity).toBe(4);
  });

  it('leaves Per Person without an implicit minimum', () => {
    const [option] = cleanBookingOptions([{ type: 'Per Person', label: 'P' }]);
    expect(option).not.toHaveProperty('minCapacity');
  });

  it('refuses a Per Group option without a minimum capacity', () => {
    const options = cleanBookingOptions([{ type: 'Per Group', label: 'Private boat' }]);
    expect(bookingOptionCapacityError(options)).toMatch(/Private boat.*minimum capacity/);
  });

  it('refuses a maximum below the minimum, naming the option', () => {
    const options = cleanBookingOptions([{ type: 'Per Family', label: 'Fam', minCapacity: 4, maxCapacity: 3 }]);
    expect(bookingOptionCapacityError(options)).toMatch(/Fam.*maximum capacity cannot be below/);
  });

  it('refuses non-integer or out-of-range capacities', () => {
    expect(bookingOptionCapacityError(cleanBookingOptions([{ type: 'Per Couple', label: 'C', minCapacity: 2.5 }])))
      .toMatch(/whole number/);
    expect(bookingOptionCapacityError(cleanBookingOptions([{ type: 'Per Person', label: 'P', maxCapacity: 5000 }])))
      .toMatch(/between 1 and 1000/);
  });

  it('accepts a fully configured set', () => {
    const options = cleanBookingOptions([
      { type: 'Per Person', label: 'Solo' },
      { type: 'Per Couple', label: 'Duo', minCapacity: 2, maxCapacity: 6 },
      { type: 'Per Group', label: 'Private', minCapacity: 5 },
    ]);
    expect(bookingOptionCapacityError(options)).toBeNull();
  });
});

describe('every booking-option write path validates capacities', () => {
  it.each([
    'app/api/admin/tours/route.ts',
    'app/api/admin/tours/[id]/route.ts',
    'app/api/tours/[tourId]/booking-options/route.ts',
  ])('%s calls bookingOptionCapacityError', (file) => {
    expect(read(file)).toContain('bookingOptionCapacityError');
  });
});

describe('booking surface honours capacity gates and unit charging', () => {
  const sidebar = read('components/BookingSidebar.tsx');

  it('gates option cards on capacityAvailability and blocks slot selection', () => {
    expect(sidebar).toContain('capacityAvailability(option, totalParticipants)');
    expect(sidebar).toContain('disabled={isSoldOut || capacityBlocked}');
    expect(sidebar).toContain('capacityBlockedMessage(capacity)');
  });

  it('steps unit-priced subtotals in whole units instead of per participant', () => {
    expect(sidebar).toContain('unitCount(totalParticipants, effectiveUnitSize(option))');
    expect(sidebar).toContain('unitCount(totalParticipants, unitSizeForTotals)');
  });

  it('clears a selection that a participant change pushed outside capacity', () => {
    expect(sidebar).toMatch(/selectedTimeSlot: null/);
  });

  it('ships the display unit contract with the cart item for checkout summaries', () => {
    expect(sidebar).toContain('unitPricing: cartUnitPricing');
  });
});

describe('tour editor exposes the capacity contract', () => {
  const form = read('components/TourForm.tsx');

  it('renders both capacity inputs', () => {
    expect(form).toContain('Minimum Capacity');
    expect(form).toContain('Maximum Capacity');
  });

  it('re-defaults the minimum when the pricing type changes', () => {
    expect(form).toContain("field === 'type'");
    expect(form).toContain('defaultMinCapacity(String(value))');
  });

  it('blocks save on capacity issues in both save paths', () => {
    expect(form).toContain('bookingOptionCapacityIssue(formData.bookingOptions)');
    expect(form).toContain('bookingOptionCapacityIssue([option])');
  });
});

describe('checkout option list collapses and puts multiple times in a dropdown', () => {
  const sidebar = read('components/BookingSidebar.tsx');

  it('collapses cards only when more than one option is offered', () => {
    expect(sidebar).toContain("collapsible={(availability?.tourOptions.length || 0) > 1}");
    expect(sidebar).toContain('const isOpen = !collapsible || expanded;');
  });

  it('opens one card at a time and keeps the selected one open', () => {
    expect(sidebar).toContain('setExpandedOptionId(prev => (prev === optionId ? null : optionId))');
    expect(sidebar).toContain("?? (bookingData.selectedTimeSlot?.optionId || null)");
  });

  it('exposes the collapse state to assistive tech', () => {
    expect(sidebar).toContain("'aria-expanded': isOpen");
    expect(sidebar).toContain("'aria-controls': bodyId");
  });

  it('moves multiple departures into a dropdown, single ones stay inline', () => {
    expect(sidebar).toContain('const usesSlotDropdown = option.timeSlots.length > 1;');
    expect(sidebar).toContain('role="listbox"');
  });

  it('keeps price and remaining spots visible on every dropdown row', () => {
    const menu = sidebar.slice(sidebar.indexOf('role="listbox"'), sidebar.indexOf('role="listbox"') + 2600);
    expect(menu).toContain('spots left');
    expect(menu).toContain('formatPrice(timeSlot.price)');
  });

  it('makes a sold-out time unselectable rather than merely styled', () => {
    const menu = sidebar.slice(sidebar.indexOf('role="listbox"'), sidebar.indexOf('role="listbox"') + 2600);
    expect(menu).toContain('disabled={isSoldOut}');
    expect(menu).toContain('if (isSoldOut) return;');
    expect(menu).toContain('Fully booked');
  });
});
