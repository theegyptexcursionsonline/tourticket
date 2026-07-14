import {
  guestProfileClaimFilter,
  isClaimableGuestProfile,
} from '@/lib/auth/guestProfileClaim';

const validGuest = {
  email: 'guest@example.com',
  role: 'customer' as const,
  isActive: true,
  isGuestProfile: true,
  password: undefined,
  firebaseUid: undefined,
};

describe('guest profile claim gate', () => {
  it('accepts only an active passwordless customer explicitly marked as a guest', () => {
    expect(isClaimableGuestProfile(validGuest)).toBe(true);
  });

  it.each([
    { ...validGuest, isGuestProfile: false },
    { ...validGuest, isActive: false },
    { ...validGuest, role: 'admin' as const },
    { ...validGuest, password: 'existing-password-hash' },
    { ...validGuest, firebaseUid: 'existing-firebase-user' },
  ])('rejects an unsafe claim candidate', (candidate) => {
    expect(isClaimableGuestProfile(candidate)).toBe(false);
  });

  it('builds an atomic filter that repeats every ownership invariant', () => {
    expect(guestProfileClaimFilter(' Guest@Example.COM ', 'record-id')).toEqual({
      _id: 'record-id',
      email: 'guest@example.com',
      role: 'customer',
      isActive: true,
      isGuestProfile: true,
      password: { $in: [null, ''] },
      firebaseUid: { $in: [null, ''] },
    });
  });

  it('is not itself an email-ownership proof', () => {
    // The filter is only the race-safe database half of a claim. Callers must
    // first verify ownership (currently Firebase emailVerified=true).
    expect(guestProfileClaimFilter('guest@example.com')).not.toHaveProperty('emailVerified');
  });
});
