import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RevenuePriceExecution from '@/lib/models/RevenuePriceExecution';
import RevenuePriceOverride from '@/lib/models/RevenuePriceOverride';
import Tour from '@/lib/models/Tour';
import { authenticateRevenueRequest, revenueError } from '@/lib/revenue/machineResponse';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ executionId: string }> }) {
  const bodyText = await request.text();
  const auth = await authenticateRevenueRequest(request, bodyText, 'write');
  if (auth.response) return auth.response;
  if (!request.headers.get('idempotency-key')) return revenueError(400, 'IDEMPOTENCY_REQUIRED', 'Idempotency-Key is required.');
  if (process.env.REVENUEPILOT_PRICING_API_ENABLED !== 'true') return revenueError(503, 'WRITES_DISABLED', 'RevenuePilot pricing writes are globally disabled.');
  await dbConnect();
  const { executionId } = await context.params;
  const receipt = await RevenuePriceExecution.findOne({ executionId, tenantId: 'default' });
  if (!receipt) return revenueError(404, 'EXECUTION_NOT_FOUND', 'Execution not found.');
  if (receipt.state === 'rollback_applied') return NextResponse.json({ state: 'rollback_applied', replayed: true, receipt });
  const updated = await RevenuePriceOverride.findOneAndUpdate(
    { executionId, version: receipt.appliedVersion, active: true },
    { $set: { prices: receipt.previousPrices, previousPrices: receipt.effectivePrices, version: receipt.appliedVersion + 1, source: 'revenuepilot', executionId: `${executionId}:rollback`, revertedAt: new Date() } },
    { new: true },
  );
  receipt.state = updated ? 'rollback_applied' : 'rollback_failed';
  receipt.rollbackExecutionId = `${executionId}:rollback`;
  receipt.events.push({ type: receipt.state, at: new Date().toISOString() });
  await receipt.save();
  if (updated) {
    const [tour, overrideSummary] = await Promise.all([
      Tour.findById(receipt.target.tourId).select('discountPrice bookingOptions').lean(),
      RevenuePriceOverride.find({ tenantId: receipt.tenantId, tourId: receipt.target.tourId, active: true }).select('prices.adult version').lean(),
    ]);
    const candidates = [Number(tour?.discountPrice), ...(tour?.bookingOptions || []).map((option) => Number(option.price)), ...overrideSummary.map((item) => Number(item.prices?.adult))].filter(Number.isFinite);
    if (candidates.length) await Tour.updateOne({ _id: receipt.target.tourId }, { $set: { pricingSummary: { fromPrice: Math.min(...candidates), currency: receipt.currency, version: updated.version, validThrough: updated.date } } });
    revalidatePath('/[locale]/[slug]', 'page');
    revalidatePath('/[locale]/tours', 'page');
    revalidatePath('/[locale]/search', 'page');
    revalidatePath('/[locale]/destinations/[slug]', 'page');
  }
  return NextResponse.json({ state: receipt.state, receipt: receipt.toObject(), effectivePrices: updated?.prices || null }, { status: updated ? 200 : 409 });
}
