import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RevenuePriceExecution from '@/lib/models/RevenuePriceExecution';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { resolveEffectivePrice } from '@/lib/revenue/pricingResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ executionId: string }> }) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const { executionId } = await context.params;
  const receipt: any = await RevenuePriceExecution.findOne({ executionId, tenantId: 'default' });
  if (!receipt) return revenueError(404, 'EXECUTION_NOT_FOUND', 'Execution not found.');
  const target = { tourId: String(receipt.target.tourId), optionKey: receipt.target.optionKey, date: receipt.target.date.toISOString().slice(0, 10), time: receipt.target.time, tenantId: receipt.tenantId };
  const effective = await resolveEffectivePrice(target);
  const matches = receipt.appliedVersion === effective.version && JSON.stringify(receipt.effectivePrices?.toObject?.() || receipt.effectivePrices) === JSON.stringify(effective.prices) && receipt.currency === effective.currency;
  receipt.readbackAttempts.push({ at: new Date(), matches, effective });
  if (matches && receipt.state === 'applied') receipt.state = 'verified';
  await receipt.save();
  return NextResponse.json({ state: receipt.state, receipt: receipt.toObject(), effective, verified: matches }, { headers: { 'Cache-Control': 'no-store' } });
}
