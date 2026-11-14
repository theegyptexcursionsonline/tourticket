import fs from 'node:fs';
import path from 'node:path';

// The booking panel printed English on the Arabic, German, French and Spanish
// sites (steps, "Find My Adventure", "Continue", "Add to Cart", "Total Price",
// the review step), told customers about a "pricing-key migration" and a
// "stop-saled" date, and filled options that had no authored details with
// invented ones: "Expert guide included", "Small group experience" and "Photo
// opportunities" under "What's Included", "Easy", and "Most Popular".
const root = process.cwd();
const panel = fs.readFileSync(path.join(root, 'components/BookingSidebar.tsx'), 'utf8');
const messages = Object.fromEntries(
  ['en', 'ar', 'de', 'fr', 'es'].map((locale) => [
    locale,
    JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), 'utf8')).booking as Record<string, string>,
  ]),
);

const NEW_KEYS = [
  'stepDateGuests', 'stepShortDate', 'stepShortOptions', 'stepEnhance', 'stepShortEnhance', 'stepShortReview',
  'chooseDate', 'findMyAdventure', 'continue', 'addToCart', 'totalPrice', 'saveAmount', 'availableDepartureTimes',
  'unavailableOnDate', 'selectAdventureDate', 'available', 'enhanceYourExperience', 'tieredCancellation',
  'whatsIncluded', 'dateClosed', 'optionNotReady',
];

describe('booking panel words', () => {
  it('has every new word in all five languages', () => {
    for (const locale of Object.keys(messages)) {
      for (const key of NEW_KEYS) {
        expect(typeof messages[locale][key]).toBe('string');
        expect(messages[locale][key].trim()).not.toBe('');
      }
    }
  });

  it('keeps the English wording customers already see', () => {
    expect(messages.en).toMatchObject({
      stepDateGuests: 'Date & Guests', stepEnhance: 'Enhance Tour', chooseDate: 'Choose Date',
      findMyAdventure: 'Find My Adventure', continue: 'Continue', addToCart: 'Add to Cart', totalPrice: 'Total Price',
      availableDepartureTimes: 'Available departure times', tieredCancellation: 'Tiered cancellation policy',
    });
  });

  it('writes Arabic in Arabic script and keeps the price placeholder', () => {
    for (const key of NEW_KEYS) expect(messages.ar[key]).toMatch(/[؀-ۿ]/);
    for (const locale of Object.keys(messages)) expect(messages[locale].saveAmount).toContain('{amount}');
  });

  it('prints none of those words in English inside the panel', () => {
    for (const english of [
      "'Start Your Booking'", "'Customize Your Trip'", '<span>Find My Adventure</span>', '<span>Checking Availability...</span>',
      "'Choose Date'", '>Booking Summary<', '<span>Great Value</span>', 'Total Price {', 'Continue <ContinueIcon',
      '/> Add to Cart', '>Enhance your experience<', '>Review & Book<', '>Available departure times<', '>Tiered cancellation policy<',
      "title: 'Date & Guests'", "isActive ? 'Current'",
    ]) {
      expect(panel).not.toContain(english);
    }
  });

  it('never tells a customer about internal states', () => {
    expect(panel).not.toMatch(/pricing-key migration|stop-saled and cannot be booked/);
    expect(messages.en.dateClosed).toBe('This date is closed for booking. Please choose another date.');
  });

  it('shows only what the tour or option actually says', () => {
    for (const invented of ["'Expert guide included'", "'Small group experience'", "'Photo opportunities'", "'Entry tickets'", "'Group photos'", "difficulty: 'Easy'", "'Most Popular'"]) {
      expect(panel).not.toContain(invented);
    }
    expect(panel).toContain('{option.highlights && option.highlights.length > 0 && (');
    expect(panel).toContain('{option.difficulty && (');
  });
});
