import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { sendContactFormEmail } from '@/lib/mailgun';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import {
  normalizeBoundedText,
  normalizeEmail,
  PublicInputError,
  readBoundedJson,
} from '@/lib/security/publicInput';

export const dynamic = 'force-dynamic';

const ONE_HOUR = 60 * 60 * 1_000;

interface ContactBody {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
  recaptchaToken?: unknown;
  submissionTime?: unknown;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token || !secret) return false;

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }).toString(),
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const data = await response.json() as { success?: boolean; score?: number; action?: string };
    return data.success === true
      && Number(data.score || 0) >= 0.5
      && (!data.action || data.action === 'contact_form');
  } catch (error) {
    console.error('Contact security verification unavailable:', error instanceof Error ? error.name : 'unknown_error');
    return false;
  }
}

function noStoreJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<ContactBody>(request, 16_384);
    const name = normalizeBoundedText(body.name, { minimum: 2, maximum: 100 });
    const email = normalizeEmail(body.email);
    const message = normalizeBoundedText(body.message, {
      minimum: 10,
      maximum: 4_000,
      collapseWhitespace: false,
    });
    if (!name || !email || !message) {
      throw new PublicInputError('Please provide a valid name, email, and message.');
    }

    // Honeypot submissions receive the same accepted shape but never send.
    // This avoids teaching automated clients how the trap is evaluated.
    if (typeof body.website === 'string' && body.website.trim()) {
      return noStoreJson({ success: true, message: 'Your message was received.' }, 202);
    }

    const submissionTime = Number(body.submissionTime);
    if (!Number.isFinite(submissionTime) || submissionTime < 3_000 || submissionTime > 86_400_000) {
      throw new PublicInputError('Please wait a moment and try again.');
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'contact-form',
      subject: email,
      networkLimit: 5,
      subjectLimit: 3,
      windowMs: ONE_HOUR,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many contact requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rate.retryAfterSeconds),
          },
        },
      );
    }

    if (process.env.RECAPTCHA_SECRET_KEY) {
      const recaptchaToken = typeof body.recaptchaToken === 'string'
        ? body.recaptchaToken.trim().slice(0, 4_096)
        : '';
      if (!recaptchaToken || !(await verifyRecaptcha(recaptchaToken))) {
        return noStoreJson(
          { success: false, error: 'Security verification failed. Please try again.' },
          400,
        );
      }
    }

    await sendContactFormEmail({ name, fromEmail: email, message });
    return noStoreJson({ success: true, message: 'Your message was sent successfully.' }, 200);
  } catch (error) {
    if (error instanceof PublicInputError) {
      return noStoreJson({ success: false, error: error.message }, error.status);
    }
    console.error('Contact form failed:', error instanceof Error ? error.message : 'unknown_error');
    return noStoreJson(
      { success: false, error: 'Your message could not be sent. Please try again later.' },
      503,
    );
  }
}
