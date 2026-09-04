import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { PublicInputError, readBoundedJson } from '@/lib/security/publicInput';
import {
  checkNewPassword,
  hashResetToken,
  passwordRuleMessage,
  RESET_TOKEN_PATTERN,
} from '@/lib/auth/passwordReset';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 *
 * Completes a platform-owned password reset. This is the recovery path that
 * Sets the platform's own bcrypt password, which is what `/api/auth/login`
 * verifies, so a successful reset restores sign-in immediately. Completing
 * the email challenge also converts a checkout guest profile into a normal
 * customer account without changing or deleting its bookings.
 */

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new link and try again.';

function noStoreJson(body: Record<string, unknown>, status: number, retryAfter?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<{
      token?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
    }>(request, 4_096);

    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!RESET_TOKEN_PATTERN.test(token)) {
      throw new PublicInputError(INVALID_LINK);
    }

    const ruleFailure = checkNewPassword(body.password, body.confirmPassword);
    if (ruleFailure) {
      throw new PublicInputError(passwordRuleMessage(ruleFailure));
    }
    const password = body.password as string;

    await dbConnect();

    const tokenHash = hashResetToken(token);
    // Bucket on the token hash, never on an email: this endpoint must not
    // require — or learn — which account is being recovered.
    const rate = await enforcePublicActionLimits({
      request,
      action: 'reset-password',
      subject: tokenHash.slice(0, 32),
      networkLimit: 20,
      subjectLimit: 5,
      windowMs: 60 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return noStoreJson(
        { success: false, error: 'Too many attempts. Please wait before trying again.' },
        429,
        rate.retryAfterSeconds,
      );
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const user = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: tokenHash,
        passwordResetExpires: { $gt: new Date() },
        isActive: { $ne: false },
      },
      {
        $set: {
          password: passwordHash,
          isGuestProfile: false,
          authProvider: 'jwt',
          emailVerified: true,
          adminLoginAttempts: 0,
          requirePasswordChange: false,
        },
        $unset: {
          passwordResetTokenHash: '',
          passwordResetExpires: '',
          adminLockUntil: '',
        },
      },
      { new: true, runValidators: false },
    );

    // The token hash is claimed and removed in the same database mutation as
    // the password update. Concurrent retries therefore have one winner; an
    // unknown, expired, already-used or deactivated link gets the same reply.
    if (!user) {
      return noStoreJson({ success: false, error: INVALID_LINK }, 400);
    }

    return noStoreJson(
      { success: true, message: 'Your password has been updated. You can sign in now.' },
      200,
    );
  } catch (error) {
    if (error instanceof PublicInputError) {
      return noStoreJson({ success: false, error: error.message }, error.status);
    }
    console.error(
      'Password reset failed:',
      error instanceof Error ? error.name : 'unknown_error',
    );
    return noStoreJson(
      { success: false, error: 'Password reset is temporarily unavailable. Please try again later.' },
      503,
    );
  }
}
