import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CheckoutSettings from '@/lib/models/CheckoutSettings';
import { paymentExperienceOrDefault } from '@/lib/checkout/paymentExperience';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const settings = await CheckoutSettings.findOne({ tenantId: 'default' })
      .select('paymentExperience -_id')
      .lean<{ paymentExperience?: unknown } | null>();

    return NextResponse.json(
      {
        success: true,
        paymentExperience: paymentExperienceOrDefault(settings?.paymentExperience),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error(
      'Checkout configuration lookup failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      {
        success: false,
        code: 'CHECKOUT_CONFIGURATION_UNAVAILABLE',
        message: 'Secure checkout is temporarily unavailable. Please try again.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
