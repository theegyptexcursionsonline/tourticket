import fs from 'node:fs';
import path from 'node:path';

// The checkout page printed English on the Arabic, German, French and Spanish
// sites: the checkout choice, the contact form, the booking summary and totals,
// the payment button, the confirmation and every message. Its words now live in
// the `checkout` section of each language file; English is unchanged.
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'app/[locale]/checkout/page.tsx'), 'utf8');
const read = (locale: string) => JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), 'utf8'));
const en = read('en').checkout as Record<string, string>;

describe('checkout page words', () => {
  it('has every checkout word in all five languages, none left empty', () => {
    const keys = Object.keys(en);
    expect(keys.length).toBeGreaterThanOrEqual(80);
    for (const locale of ['ar', 'de', 'fr', 'es']) {
      const words = read(locale).checkout as Record<string, string>;
      expect(Object.keys(words).sort()).toEqual([...keys].sort());
      for (const key of keys) expect(words[key].trim()).not.toBe('');
    }
  });

  it('writes Arabic in Arabic script', () => {
    const ar = read('ar').checkout as Record<string, string>;
    for (const [key, word] of Object.entries(ar)) {
      expect({ key, arabic: /[؀-ۿ]/.test(word) }).toEqual({ key, arabic: true });
    }
  });

  it('keeps the English customers already see', () => {
    expect(en).toMatchObject({
      howCheckout: 'How would you like to checkout?', summaryTitle: 'Your Booking Summary', subtotal: 'Subtotal',
      serviceFee: 'Service fee', taxes: 'Taxes & fees', total: 'Total', continueToPayment: 'Continue to secure payment',
      confirmedTitle: 'Booking Confirmed!', totalPaid: 'Total Paid', firstName: 'First Name',
    });
  });

  it('prints none of those words in English inside the page', () => {
    for (const english of [
      '>How would you like to checkout?<', '>Your Booking Summary<', '<span>Subtotal</span>', '<span>Service fee</span>',
      '<span>Taxes & fees</span>', ' Continue to secure payment</span>', 'label="First Name"', 'placeholder="Enter your email address"',
      '>Booking Confirmed!<', '>Order Summary<', '>Total Paid<', "'Please select a checkout option'", '>Loading your booking...<',
      "Adult${item.quantity > 1 ? 's' : ''}",
    ]) {
      expect(page).not.toContain(english);
    }
  });
});
