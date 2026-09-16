import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyCron } from '@/lib/auth/verifyCron';
import { TWO_FACTOR_KEY_MIN_LENGTH } from '@/lib/auth/twoFactor';
import { rekeyTwoFactorSecrets } from '@/lib/auth/twoFactorRekey';

export const dynamic = 'force-dynamic';

const APPLY_CONFIRMATION = 'rotate-two-factor-key';

/**
 * Operator-only key rotation for stored authenticator secrets.
 *
 * Exists only while TWO_FACTOR_ENCRYPTION_KEY_NEXT is configured; otherwise the route reports
 * not found, so a deployment that has no rotation in progress exposes nothing. Defaults to a dry
 * run; applying requires an explicit confirmation phrase in the body.
 */
export async function POST(request: NextRequest) {
  const authError = verifyCron(request);
  if (authError) return authError;

  const nextKey = process.env.TWO_FACTOR_ENCRYPTION_KEY_NEXT;
  if (!nextKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const currentKey = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (
    !currentKey
    || currentKey.length < TWO_FACTOR_KEY_MIN_LENGTH
    || nextKey.length < TWO_FACTOR_KEY_MIN_LENGTH
    || currentKey === nextKey
  ) {
    return NextResponse.json(
      { success: false, error: 'Two-factor keys are not configured for rotation.' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null) as { dryRun?: unknown; confirm?: unknown } | null;
  const apply = body?.dryRun === false;
  if (apply && body?.confirm !== APPLY_CONFIRMATION) {
    return NextResponse.json(
      { success: false, error: `Applying requires confirm: "${APPLY_CONFIRMATION}".` },
      { status: 400 },
    );
  }

  await dbConnect();
  const summary = await rekeyTwoFactorSecrets({
    fromRawKey: currentKey,
    toRawKey: nextKey,
    dryRun: !apply,
  });
  const success = summary.undecryptable === 0 && summary.conflicted === 0;
  return NextResponse.json({ success, ...summary }, { status: success ? 200 : 207 });
}
