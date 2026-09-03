import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/lib/models/user';
import { buildResetUrl, createResetToken } from '@/lib/auth/passwordReset';
import { generateFirebasePasswordResetLink } from '@/lib/firebase/admin';
import { sendPasswordResetEmail } from '@/lib/mailgun';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { normalizeEmail, PublicInputError, readBoundedJson } from '@/lib/security/publicInput';

export const dynamic = 'force-dynamic';

const GENERIC_MESSAGE = 'If an eligible account exists and email delivery succeeds, reset instructions will arrive shortly.';

function noStoreJson(body: Record<string, unknown>, status: number, retryAfter?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
    },
  });
}

function configuredBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_BASE_URL;
  if (!value) throw new Error('password_reset_base_url_missing');
  const parsed = new URL(value);
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('password_reset_base_url_must_use_https');
  }
  return parsed.origin;
}

function firebaseErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return String((error as { code?: unknown }).code || '');
}

/**
 * Issue a platform-owned reset link for `email`, or `null` when there is no
 * eligible account. Only the token's hash is persisted.
 */
async function issuePlatformResetUrl(email: string, baseOrigin: string): Promise<string | null> {
  const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpires');
  if (!user || user.isActive === false) return null;

  const issued = createResetToken();
  user.passwordResetTokenHash = issued.tokenHash;
  user.passwordResetExpires = issued.expiresAt;
  await user.save({ validateBeforeSave: false });

  return buildResetUrl(baseOrigin, issued.token, email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<{ email?: unknown }>(request, 4_096);
    const email = normalizeEmail(body.email);
    if (!email) throw new PublicInputError('Please enter a valid email address.');

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'forgot-password',
      subject: email,
      networkLimit: 12,
      subjectLimit: 4,
      windowMs: 60 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return noStoreJson(
        { success: false, error: 'Too many reset requests. Please try again later.' },
        429,
        rate.retryAfterSeconds,
      );
    }

    // Fail the entire service closed before performing an account lookup, so
    // provider misconfiguration cannot become an account-enumeration oracle.
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      throw new Error('password_reset_delivery_not_configured');
    }
    const continueUrl = `${configuredBaseUrl()}/login`;

    let resetUrl: string;
    try {
      resetUrl = await generateFirebasePasswordResetLink(email, continueUrl);
    } catch (error) {
      const code = firebaseErrorCode(error);
      if (code === 'auth/user-not-found' || code === 'auth/user-disabled') {
        return noStoreJson({ success: true, message: GENERIC_MESSAGE }, 202);
      }
      // The provider cannot issue a link. Account recovery is the one path
      // that must not depend on it — otherwise a provider outage locks every
      // customer out of their own account for its duration. Fall back to a
      // platform-owned token, which sets the bcrypt password `/api/auth/login`
      // verifies, so a reset restores sign-in immediately.
      console.error(
        'Provider reset link unavailable, using platform recovery:',
        error instanceof Error ? error.name : 'unknown_error',
      );
      const platformUrl = await issuePlatformResetUrl(email, configuredBaseUrl());
      // No eligible account: answer exactly as for a known one.
      if (!platformUrl) {
        return noStoreJson({ success: true, message: GENERIC_MESSAGE }, 202);
      }
      resetUrl = platformUrl;
    }

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (error) {
      // Do not return a different shape for a known account. The wording never
      // claims delivery occurred and therefore remains truthful.
      console.error('Password reset delivery failed:', error instanceof Error ? error.name : 'unknown_error');
    }

    return noStoreJson({ success: true, message: GENERIC_MESSAGE }, 202);
  } catch (error) {
    if (error instanceof PublicInputError) {
      return noStoreJson({ success: false, error: error.message }, error.status);
    }
    console.error('Password reset request unavailable:', error instanceof Error ? error.message : 'unknown_error');
    return noStoreJson(
      { success: false, error: 'Password reset is temporarily unavailable. Please try again later.' },
      503,
    );
  }
}
