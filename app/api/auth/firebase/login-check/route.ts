import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { normalizeEmail, PublicInputError, readBoundedJson } from '@/lib/security/publicInput';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<{ email?: unknown }>(request, 4_096);
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'firebase-customer-login',
      subject: email,
      networkLimit: 30,
      subjectLimit: 10,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rate.retryAfterSeconds),
          },
        },
      );
    }

    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof PublicInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Firebase login check unavailable:', error instanceof Error ? error.message : 'unknown_error');
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable. Please try again later.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
