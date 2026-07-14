import type { FilterQuery } from 'mongoose';
import type { IUser } from '@/lib/models/user';

type ClaimCandidate = Pick<IUser, 'email' | 'role' | 'isActive' | 'isGuestProfile'> & {
  password?: string | null;
  firebaseUid?: string | null;
};

/**
 * A checkout-created profile is the only record that may be claimed by a new
 * authentication method. Email equality alone is deliberately insufficient.
 */
export function isClaimableGuestProfile(user: ClaimCandidate | null | undefined): boolean {
  return Boolean(
    user
      && user.isActive
      && user.role === 'customer'
      && user.isGuestProfile === true
      && !user.password
      && !user.firebaseUid,
  );
}

export function guestProfileClaimFilter(
  email: string,
  id?: unknown,
): FilterQuery<IUser> {
  return {
    ...(id ? { _id: id } : {}),
    email: email.trim().toLowerCase(),
    role: 'customer',
    isActive: true,
    isGuestProfile: true,
    password: { $in: [null, ''] },
    firebaseUid: { $in: [null, ''] },
  };
}
