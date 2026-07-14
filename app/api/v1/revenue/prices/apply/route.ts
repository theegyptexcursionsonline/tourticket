import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { applyPriceWrite, validatePriceWrite } from '@/lib/revenue/priceWrite';
import { requireRevenueIdempotencyKey, RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { revalidatePricingPaths } from '@/lib/revenue/revalidatePricing';
import { syncTourPricingSearchIndex } from '@/lib/revenue/pricingSummary';

export const dynamic = 'force-dynamic';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Price apply failed.';

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const auth = await authenticateRevenueRequest(request, bodyText, 'write');
  if (auth.response) return auth.response;
  if (process.env.REVENUEPILOT_PRICING_API_ENABLED !== 'true') return revenueError(503, 'WRITES_DISABLED', 'RevenuePilot pricing writes are globally disabled.');
  try {
    const idempotencyKey = requireRevenueIdempotencyKey(request.headers.get('idempotency-key'));
    const input = validatePriceWrite(JSON.parse(bodyText));
    if (input.tenantId !== 'default') return revenueError(403, 'TENANT_FORBIDDEN', 'This identity is scoped to EEO only.');
    await dbConnect();
    const result = await applyPriceWrite(input, idempotencyKey, bodyText);
    if (!result) throw new Error('Price execution returned no outcome.');
    if (result.state === 'conflict') return NextResponse.json(result, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    if (result.state === 'blocked') return NextResponse.json(result, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    if (result.state === 'pending' || result.state === 'rollback_pending') return NextResponse.json(result, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    if (result.state === 'rollback_failed') return NextResponse.json(result, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    let channelPropagation: Record<string, string> | undefined;
    if (result.state === 'applied') {
      revalidatePricingPaths();
      const searchSynced = await syncTourPricingSearchIndex(input.target.tourId);
      channelPropagation = {
        eeo_direct: searchSynced ? 'verified' : 'failed',
        getyourguide: 'not_connected',
        viator: 'not_connected',
      };
    }
    return NextResponse.json(
      channelPropagation ? { ...result, channelPropagation } : result,
      { status: result.state === 'replayed' || result.state === 'rollback_applied' ? 200 : 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: unknown) {
    if (error instanceof RevenuePricingWriteError) return revenueError(error.status, error.code, error.message);
    const message = errorMessage(error);
    const status = /outside policy corridor/.test(message) ? 422 : /Missing|Invalid|Only USD/.test(message) ? 400 : 500;
    return revenueError(status, status === 422 ? 'PRICE_BLOCKED_BY_POLICY' : 'PRICE_APPLY_FAILED', message);
  }
}
