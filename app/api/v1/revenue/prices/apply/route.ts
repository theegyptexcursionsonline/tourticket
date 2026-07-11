import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { applyPriceWrite, validatePriceWrite } from '@/lib/revenue/priceWrite';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const auth = await authenticateRevenueRequest(request, bodyText, 'write');
  if (auth.response) return auth.response;
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey) return revenueError(400, 'IDEMPOTENCY_REQUIRED', 'Idempotency-Key is required.');
  if (process.env.REVENUEPILOT_PRICING_API_ENABLED !== 'true') return revenueError(503, 'WRITES_DISABLED', 'RevenuePilot pricing writes are globally disabled.');
  try {
    const input = validatePriceWrite(JSON.parse(bodyText));
    if (input.tenantId !== 'default') return revenueError(403, 'TENANT_FORBIDDEN', 'This identity is scoped to EEO only.');
    await dbConnect();
    const result = await applyPriceWrite(input, idempotencyKey, bodyText);
    if (result.state === 'conflict') return NextResponse.json({ state: 'conflict', effective: result.current }, { status: 409 });
    if (result.state === 'blocked') return NextResponse.json({ state: 'blocked', reason: result.reason, effective: result.current }, { status: 422 });
    if (result.state === 'applied') {
      revalidatePath('/[locale]/[slug]', 'page');
      revalidatePath('/[locale]/tours', 'page');
      revalidatePath('/[locale]/search', 'page');
      revalidatePath('/[locale]/destinations/[slug]', 'page');
    }
    return NextResponse.json(result, { status: result.state === 'replayed' ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return revenueError(/Missing|Invalid|Only USD/.test(error?.message) ? 400 : 500, 'PRICE_APPLY_FAILED', error?.message || 'Price apply failed.');
  }
}
