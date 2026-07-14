import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { rollbackPriceExecution } from '@/lib/revenue/priceRollback';
import { requireRevenueIdempotencyKey, RevenuePricingWriteError } from '@/lib/revenue/priceWriteGate';
import { revalidatePricingPaths } from '@/lib/revenue/revalidatePricing';
import { refreshTourPricingSummary, syncTourPricingSearchIndex } from '@/lib/revenue/pricingSummary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ executionId: string }> }) {
  const bodyText = await request.text();
  const auth = await authenticateRevenueRequest(request, bodyText, 'write');
  if (auth.response) return auth.response;

  try {
    const idempotencyKey = requireRevenueIdempotencyKey(request.headers.get('idempotency-key'));
    await dbConnect();
    const { executionId } = await context.params;
    const result = await rollbackPriceExecution(executionId, idempotencyKey, bodyText);

    let channelPropagation: Record<string, string> | undefined;
    if (result.state === 'rollback_applied' && !result.replayed) {
      const receipt = result.receipt;
      await refreshTourPricingSummary(String(receipt.target.tourId), receipt.currency);
      revalidatePricingPaths();
      const searchSynced = await syncTourPricingSearchIndex(String(receipt.target.tourId));
      channelPropagation = {
        eeo_direct: searchSynced ? 'verified' : 'failed',
        getyourguide: 'not_connected',
        viator: 'not_connected',
      };
    }

    const status = result.state === 'rollback_pending' ? 202 : result.state === 'rollback_failed' ? 409 : 200;
    return NextResponse.json(channelPropagation ? { ...result, channelPropagation } : result, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof RevenuePricingWriteError) return revenueError(error.status, error.code, error.message);
    return revenueError(500, 'ROLLBACK_FAILED', error instanceof Error ? error.message : 'Rollback failed.');
  }
}
