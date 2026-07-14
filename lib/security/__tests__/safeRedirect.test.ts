import { safeRelativeRedirect } from '../safeRedirect';

describe('safeRelativeRedirect', () => {
  it('allows application-relative destinations', () => {
    expect(safeRelativeRedirect('/user/bookings?from=login')).toBe('/user/bookings?from=login');
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/safe\n//evil.example',
    '/safe\u0000path',
  ])(
    'rejects external or ambiguous redirect %s',
    (value) => expect(safeRelativeRedirect(value)).toBe('/user/dashboard'),
  );
});
