import { isValidWorkEmail } from '@/lib/validation/email';

describe('work email validation', () => {
  it('accepts modern long top-level domains used by staff addresses', () => {
    expect(isValidWorkEmail('esraa.khaled@excursions.online')).toBe(true);
  });

  it('rejects malformed email addresses', () => {
    expect(isValidWorkEmail('esraa.khaled@excursions')).toBe(false);
  });
});
