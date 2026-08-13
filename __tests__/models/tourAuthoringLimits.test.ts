import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'lib/models/Tour.ts'), 'utf8');

describe('Tour authoring collections', () => {
  it('does not impose the former low item-count caps', () => {
    expect(source).not.toMatch(/Cannot have more than (10 booking options|20 add-ons|20 FAQ items|30 itinerary items)/);
    expect(source).not.toContain('Must have between 1 and 20 time slots');
    expect(source).toContain("message: 'At least one time slot is required'");
  });

  it('keeps add-on descriptions optional while preserving named, priced add-ons', () => {
    const addOnSchema = source.slice(source.indexOf('const AddOnSchema'), source.indexOf('const ItineraryTranslationItemSchema'));
    const description = addOnSchema.slice(addOnSchema.indexOf('description:'), addOnSchema.indexOf('price:'));
    expect(description).not.toContain('required: true');
    expect(description).not.toContain('minlength');
    expect(addOnSchema.slice(addOnSchema.indexOf('name:'), addOnSchema.indexOf('description:'))).toContain('required: true');
    expect(addOnSchema.slice(addOnSchema.indexOf('price:'), addOnSchema.indexOf('category:'))).toContain('required: true');
  });
});
