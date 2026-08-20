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
