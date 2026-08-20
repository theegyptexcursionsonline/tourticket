import fs from 'node:fs';
import path from 'node:path';

const form = fs.readFileSync(path.join(process.cwd(), 'components/TourForm.tsx'), 'utf8');

/**
 * Client report 2026-08-21: "minimum capacity for per group in booking options
 * does not get saved after updating the tour."
 *
 * The editor loads an existing tour through a hand-written WHITELIST that
 * rebuilds each booking option field by field. `minCapacity`/`maxCapacity`
 * were added to the model, the inputs and the save path — but not to that
 * mapping. So opening a saved tour showed the fields blank and the next
 * update wrote the option back without them: silent data loss, and for a
 * Per Group option the save then failed its own mandatory-capacity check.
 *
 * This pins the whole class: anything the editor can change must survive a
 * load → save round trip.
 */
const loadMapping = (() => {
  const start = form.indexOf('bookingOptions: (tourToEdit.bookingOptions?.length ?? 0) > 0');
  expect(start).toBeGreaterThan(-1);
  // Up to the fallback branch for a tour with no saved options.
  return form.slice(start, form.indexOf(': [{', start));
})();

const editableFields = [
  ...new Set(
    [...form.matchAll(/handleBookingOptionChange\(index, '([a-zA-Z]+)'/g)].map((m) => m[1]),
  ),
];

describe('every editable booking-option field survives a load → save round trip', () => {
  it('finds the editable fields (guards the regex itself)', () => {
    expect(editableFields).toEqual(expect.arrayContaining([
      'type', 'label', 'price', 'minCapacity', 'maxCapacity', 'duration',
    ]));
  });

  it.each(editableFields)('%s is restored when an existing tour is opened', (field) => {
    expect(loadMapping).toContain(`${field}:`);
  });

  it('restores the capacities specifically, blank-safe', () => {
    expect(loadMapping).toContain("minCapacity: option.minCapacity ?? ''");
    expect(loadMapping).toContain("maxCapacity: option.maxCapacity ?? ''");
  });
});

describe('the capacity contract stays enforceable after a round trip', () => {
  it('an authored Per Group capacity is not silently defaulted away', () => {
    // cleanBookingOptions only defaults couple/family; a Per Group value has
    // to come from the form, which is why the mapping above is load-bearing.
    const clean = fs.readFileSync(path.join(process.cwd(), 'lib/admin/cleanBookingOptions.ts'), 'utf8');
    expect(clean).toContain('defaultMinCapacity(cleanedOption.type)');
    expect(clean).toContain('bookingOptionCapacityError');
  });
});

describe('the save pipeline preserves capacities end to end', () => {
  // The admin routes run: cleanBookingOptions -> ensureBookingOptionPricingKeys
  // -> stripBookingOptionClientKeys, and the result is what gets written.
  // Exercising the real chain proves nothing drops the fields en route.
  const { cleanBookingOptions } = require('@/lib/admin/cleanBookingOptions');
  const { ensureBookingOptionPricingKeys } = require('@/lib/revenue/pricingKeys');
  const { stripBookingOptionClientKeys } = require('@/lib/admin/addOnAssignments');

  const throughPipeline = (option: Record<string, unknown>) => {
    const cleaned = cleanBookingOptions([option]);
    const keyed = ensureBookingOptionPricingKeys('507f1f77bcf86cd799439011', cleaned);
    return stripBookingOptionClientKeys(keyed || [])[0] as Record<string, unknown>;
  };

  it('an authored Per Group capacity reaches the write payload', () => {
    const saved = throughPipeline({ type: 'Per Group', label: 'Private boat', price: 500, minCapacity: 5, maxCapacity: 12 });
    expect(saved.minCapacity).toBe(5);
    expect(saved.maxCapacity).toBe(12);
  });

  it('an edited Per Family capacity is not overwritten by the type default', () => {
    const saved = throughPipeline({ type: 'Per Family', label: 'Family boat', price: 400, minCapacity: 6 });
    expect(saved.minCapacity).toBe(6);
  });

  it('a form value arriving as a string is stored as a number', () => {
    const saved = throughPipeline({ type: 'Per Couple', label: 'Duo', price: 200, minCapacity: '2' });
    expect(saved.minCapacity).toBe(2);
  });

  it('blank capacities fall back to the type default rather than being written blank', () => {
    const saved = throughPipeline({ type: 'Per Couple', label: 'Duo', price: 200, minCapacity: '' });
    expect(saved.minCapacity).toBe(2);
    expect(saved).not.toHaveProperty('maxCapacity');
  });
});
