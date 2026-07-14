import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { PublicInputError, readBoundedJson } from '@/lib/security/publicInput';

type DiscountVerificationBody = { code?: unknown };

function normalizeDiscountCode(value: unknown) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return code.length >= 1 && code.length <= 64 && /^[A-Z0-9_-]+$/.test(code)
    ? code
    : null;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson<DiscountVerificationBody>(request, 1_024);
    const code = normalizeDiscountCode(body.code);
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid coupon code.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'discount-verify',
      subject: code,
      networkLimit: 30,
      subjectLimit: 10,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many coupon attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfterSeconds) },
        },
      );
    }

    const discount = await Discount.findOne({ code })
      .select('discountType value isActive expiresAt usageLimit timesUsed')
      .lean();
    const unavailable = !discount
      || !discount.isActive
      || Boolean(discount.expiresAt && new Date(discount.expiresAt) < new Date())
      || Boolean(discount.usageLimit && discount.timesUsed >= discount.usageLimit);
    if (unavailable) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unavailable coupon code.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Only the fields required to preview a discount are public. Usage counts,
    // limits, timestamps, and the stored document identity stay server-side.
    return NextResponse.json(
      {
        success: true,
        data: { discountType: discount.discountType, value: discount.value },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof PublicInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('Coupon verification failed:', error instanceof Error ? error.message : 'unknown_error');
    return NextResponse.json(
      { success: false, error: 'Coupon verification is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
