// Firebase Authentication helper utilities
import { verifyFirebaseToken } from './admin';
import { verifyToken } from '@/lib/jwt';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import type { IUser } from '@/lib/models/user';
import { NextRequest } from 'next/server';
import {
  guestProfileClaimFilter,
  isClaimableGuestProfile,
} from '@/lib/auth/guestProfileClaim';

interface FirebaseProviderInfo {
  providerId?: string;
}

type FirebaseAuthenticationResult =
  | { success: false; error: string; statusCode: number; user?: never; firebaseUid?: never; email?: never; emailVerified?: never }
  | { success: true; user: IUser; firebaseUid: string; email?: string; emailVerified?: boolean; error?: never; statusCode?: never };

/**
 * Extract Firebase ID token from request headers
 * Supports both Authorization: Bearer and custom X-Firebase-Token header
 */
export function extractFirebaseToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const firebaseHeader = request.headers.get('x-firebase-token');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  if (firebaseHeader) {
    return firebaseHeader;
  }

  return null;
}

/**
 * Authenticate a session issued by the platform's own credential store
 * (`/api/auth/login`, `/api/auth/signup`) from its httpOnly `authToken` cookie.
 *
 * Two guards, because a cookie — unlike a Bearer token — is sent by the browser
 * automatically:
 *  - the cookie is `SameSite=Lax`, so it is not sent on cross-site POSTs; and
 *  - a cross-origin request is refused outright here rather than trusted.
 * Together those keep the state-changing routes below this helper free of CSRF
 * exposure that the Bearer-only model did not have.
 */
async function authenticatePlatformSession(request: NextRequest): Promise<FirebaseAuthenticationResult> {
  const sessionToken = request.cookies.get('authToken')?.value;
  if (!sessionToken) {
    return { success: false, error: 'No authentication token provided', statusCode: 401 };
  }

  const origin = request.headers.get('origin');
  if (origin) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === request.headers.get('host');
    } catch {
      sameOrigin = false;
    }
    if (!sameOrigin) {
      return { success: false, error: 'Invalid or expired token', statusCode: 401 };
    }
  }

  let subject: string | undefined;
  try {
    const payload = (await verifyToken(sessionToken)) as { sub?: unknown } | null;
    if (payload && typeof payload.sub === 'string' && payload.sub.length > 0) {
      subject = payload.sub;
    }
  } catch {
    subject = undefined;
  }
  if (!subject) {
    return { success: false, error: 'Invalid or expired token', statusCode: 401 };
  }

  await dbConnect();
  const user = (await User.findOne({ _id: subject, isActive: true })) as IUser | null;
  if (!user) {
    return { success: false, error: 'User not found or inactive', statusCode: 404 };
  }

  return {
    success: true,
    user,
    // Platform sessions carry no provider uid. Callers read `user`; this stays
    // present only so the result shape is identical for both session types.
    firebaseUid: String((user as unknown as { firebaseUid?: string }).firebaseUid || ''),
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
  };
}

/**
 * Verify Firebase token and get MongoDB user
 * This is the main authentication middleware for user routes
 */
export async function authenticateFirebaseUser(request: NextRequest): Promise<FirebaseAuthenticationResult> {
  const token = extractFirebaseToken(request);

  // A customer who signed in through the platform's own credential store holds
  // a session cookie, not a provider ID token. Without this they would be
  // signed in yet unable to use their cart, wishlist, profile or checkout —
  // every route below this helper would reject them. Tried when no provider
  // token is present, and again when one fails to verify, because the provider
  // being unreachable is exactly when this path matters.
  if (!token) {
    return authenticatePlatformSession(request);
  }

  // Verify Firebase token
  const verifyResult = await verifyFirebaseToken(token);

  if (!verifyResult.success || !verifyResult.uid) {
    const platform = await authenticatePlatformSession(request);
    if (platform.success) return platform;
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    };
  }

  // Connect to database
  await dbConnect();

  // Find user by Firebase UID
  const user = await User.findOne({
    firebaseUid: verifyResult.uid,
    isActive: true,
  });

  if (!user) {
    return {
      success: false,
      error: 'User not found or inactive',
      statusCode: 404,
    };
  }

  return {
    success: true,
    user,
    firebaseUid: verifyResult.uid,
    email: verifyResult.email,
    emailVerified: verifyResult.emailVerified,
  };
}

/**
 * Sync Firebase user with MongoDB
 * Creates or updates MongoDB user record based on Firebase auth data
 */
export async function syncFirebaseUserToMongo(firebaseUser: {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  providerData?: FirebaseProviderInfo[];
}) {
  await dbConnect();

  const email = firebaseUser.email?.trim().toLowerCase();
  if (!email || firebaseUser.emailVerified !== true) {
    throw Object.assign(new Error('A verified email is required'), { code: 'ACCOUNT_LINK_REQUIRED' });
  }

  // Determine auth provider from Firebase
  let authProvider: 'firebase' | 'google' = 'firebase';
  if (firebaseUser.providerData && firebaseUser.providerData.length > 0) {
    const provider = firebaseUser.providerData[0]?.providerId;
    if (provider === 'google.com') {
      authProvider = 'google';
    }
  }

  // Split display name into first and last name
  let firstName = 'User';
  let lastName = '';
  if (firebaseUser.displayName) {
    const nameParts = firebaseUser.displayName.split(' ');
    firstName = nameParts[0] || 'User';
    lastName = nameParts.slice(1).join(' ') || '';
  }

  // Check if user already exists by Firebase UID
  let user: IUser | null = await User.findOne({ firebaseUid: firebaseUser.uid })
    .select('+firebaseUid +password') as IUser | null;
  let isNewUser = false;

  if (user) {
    if (!user.isActive || user.role !== 'customer' || user.isGuestProfile) {
      throw Object.assign(new Error('Firebase sync is restricted to active customer accounts'), { code: 'ACCOUNT_LINK_REQUIRED' });
    }
    // Update existing user (same Firebase account)
    user.email = email;
    user.emailVerified = firebaseUser.emailVerified;
    user.photoURL = firebaseUser.photoURL || user.photoURL;
    user.authProvider = authProvider;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    // Check if user exists by email (migration case or different auth method)
    user = await User.findOne({ email }).select('+firebaseUid +password') as IUser | null;

    if (user) {
      if (!isClaimableGuestProfile(user)) {
        // Email ownership alone must never link a normal local account. Only a
        // checkout-created, explicitly marked passwordless guest profile can
        // be claimed after Firebase has verified the email address.
        throw Object.assign(new Error('Existing account requires explicit linking'), { code: 'ACCOUNT_LINK_REQUIRED' });
      }

      try {
        const claimedUser = await User.findOneAndUpdate(
          guestProfileClaimFilter(email, user._id),
          {
            $set: {
              firebaseUid: firebaseUser.uid,
              authProvider,
              emailVerified: firebaseUser.emailVerified,
              isGuestProfile: false,
              lastLoginAt: new Date(),
              ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL } : {}),
            },
          },
          { new: true, runValidators: true },
        );

        if (claimedUser) {
          user = claimedUser;
          isNewUser = true;
        } else {
          // A same-UID retry may arrive after the first atomic claim. A
          // different-UID race must fail closed.
          const replayedClaim = await User.findOne({
            firebaseUid: firebaseUser.uid,
            email,
            role: 'customer',
            isActive: true,
            isGuestProfile: false,
          });
          if (!replayedClaim) {
            throw Object.assign(new Error('Guest profile claim lost a concurrency race'), { code: 'ACCOUNT_LINK_REQUIRED' });
          }
          user = replayedClaim;
        }
      } catch (error: unknown) {
        if ((error as { code?: number | string }).code === 11000) {
          throw Object.assign(new Error('Guest profile is already linked'), { code: 'ACCOUNT_LINK_REQUIRED' });
        }
        throw error;
      }
    } else {
      // Create new user
      user = await User.create({
        firebaseUid: firebaseUser.uid,
        email,
        firstName,
        lastName,
        authProvider,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        role: 'customer', // Default role for new users
        permissions: [],
        isGuestProfile: false,
        isActive: true,
        lastLoginAt: new Date(),
      });
      isNewUser = true;
    }
  }

  return {
    success: true,
    isNewUser,
    user: {
      id: String(user._id),
      _id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      permissions: user.permissions,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      authProvider: user.authProvider,
    },
  };
}

/**
 * Check if a user exists by email
 */
export async function checkUserExists(email: string) {
  await dbConnect();
  const user = await User.findOne({ email });
  return !!user;
}

/**
 * Get user by Firebase UID
 */
export async function getUserByFirebaseUid(uid: string) {
  await dbConnect();
  const user = await User.findOne({ firebaseUid: uid, isActive: true });
  return user;
}

/**
 * Format user object for client response
 * Removes sensitive fields and formats for consistency
 */
export function formatUserForClient(user: IUser) {
  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    permissions: user.permissions || [],
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };
}
