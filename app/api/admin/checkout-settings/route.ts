import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CheckoutSettings from '@/lib/models/CheckoutSettings';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import {
  DEFAULT_PAYMENT_EXPERIENCE,
  isPaymentExperience,
  paymentExperienceOrDefault,
} from '@/lib/checkout/paymentExperience';
import { PublicInputError, readBoundedJson } from '@/lib/security/publicInput';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['managePayments'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const settings = await CheckoutSettings.findOne({ tenantId: 'default' })
      .select('paymentExperience updatedAt -_id')
      .lean<{ paymentExperience?: unknown; updatedAt?: Date } | null>();

    return NextResponse.json({
      success: true,
      data: {
        paymentExperience: paymentExperienceOrDefault(settings?.paymentExperience),
        updatedAt: settings?.updatedAt || null,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(
      'Admin checkout settings lookup failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      { success: false, error: 'Checkout settings are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

async function PUTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['managePayments'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await readBoundedJson<{ paymentExperience?: unknown }>(request, 4 * 1024);
    if (!isPaymentExperience(body.paymentExperience)) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_PAYMENT_EXPERIENCE',
          error: 'Choose inline payment, secure modal, or Stripe-hosted checkout.',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    await dbConnect();
    const existing = await CheckoutSettings.findOne({ tenantId: 'default' })
      .select('paymentExperience')
      .lean<{ paymentExperience?: unknown } | null>();
    const previous = paymentExperienceOrDefault(
      existing?.paymentExperience ?? DEFAULT_PAYMENT_EXPERIENCE,
    );
    const settings = await CheckoutSettings.findOneAndUpdate(
      { tenantId: 'default' },
      {
        $set: { paymentExperience: body.paymentExperience },
        $setOnInsert: { tenantId: 'default' },
      },
      { upsert: true, new: true, runValidators: true },
    ).select('paymentExperience updatedAt -_id').lean<{
      paymentExperience: unknown;
      updatedAt?: Date;
    }>();

    registerAdminAuditDetail({
      action: 'update',
      resourceType: 'checkout-settings',
      resourceId: 'default',
      resourceLabel: 'Default storefront payment experience',
      summary: 'Updated checkout payment experience',
      changedFields: previous === body.paymentExperience ? [] : ['paymentExperience'],
      changes: previous === body.paymentExperience ? [] : [{
        field: 'paymentExperience',
        before: previous,
        after: body.paymentExperience,
      }],
      tenantIds: ['default'],
      replaceCapturedInput: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentExperience: paymentExperienceOrDefault(settings?.paymentExperience),
        updatedAt: settings?.updatedAt || null,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof PublicInputError) {
      return NextResponse.json(
        { success: false, code: 'INVALID_REQUEST', error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error(
      'Admin checkout settings update failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      { success: false, error: 'Checkout settings could not be saved.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export const PUT = withAdminAudit(PUTHandler);
