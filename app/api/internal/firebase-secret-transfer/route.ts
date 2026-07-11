import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function matchesSecret(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.FIREBASE_SECRET_TRANSFER_TOKEN || '';
  const providedToken = request.headers.get('x-transfer-token') || '';

  if (!expectedToken || !providedToken || !matchesSecret(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const credential = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!credential) {
    return NextResponse.json({ error: 'Credential unavailable' }, { status: 503 });
  }

  return NextResponse.json(
    { credential },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Security-Policy': "default-src 'none'",
      },
    },
  );
}
