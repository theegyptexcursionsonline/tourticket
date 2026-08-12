import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    stripeInstance = new Stripe(key, { apiVersion: '2025-08-27.basil' });
  }
  return stripeInstance;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')?.trim() || '';
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9]{10,240}$/.test(sessionId)) {
    return NextResponse.json(
      { success: false, code: 'INVALID_CHECKOUT_SESSION', message: 'This checkout confirmation link is invalid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'checkout-session-status',
      subject: sessionId,
      networkLimit: 120,
      subjectLimit: 90,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, code: 'RATE_LIMITED', message: 'Please wait before checking this booking again.' },
        {
          status: 429,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.retryAfterSeconds) },
        },
      );
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      session.metadata?.has_booking_data !== 'true'
      || session.metadata.checkout_experience !== 'hosted'
    ) {
      return NextResponse.json(
        {
          success: false,
          code: 'CHECKOUT_SESSION_NOT_FOUND',
          message: 'This checkout confirmation link is no longer available.',
        },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;
    const bookings = paymentIntentId
      ? await Booking.find({ tenantId: 'default', paymentId: paymentIntentId })
        .select('bookingReference status paymentStatus -_id')
        .sort({ paymentItemIndex: 1, createdAt: 1 })
        .lean<Array<{ bookingReference: string; status?: string; paymentStatus?: string }>>()
      : [];
    const confirmed = bookings.length > 0
      && bookings.every((booking) => booking.status === 'Confirmed' && booking.paymentStatus === 'paid');

    const status = confirmed
      ? 'confirmed'
      : session.payment_status === 'paid'
        ? 'processing'
        : session.status === 'expired'
          ? 'expired'
          : 'open';

    return NextResponse.json({
      success: true,
      status,
      paymentStatus: session.payment_status,
      bookingReferences: confirmed ? bookings.map((booking) => booking.bookingReference) : [],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidSession = (error as { type?: string; code?: string }).type === 'StripeInvalidRequestError';
    console.error(
      'Checkout Session status lookup failed:',
      invalidSession ? 'Session not found' : error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      {
        success: false,
        code: invalidSession ? 'CHECKOUT_SESSION_NOT_FOUND' : 'CHECKOUT_STATUS_UNAVAILABLE',
        message: invalidSession
          ? 'This checkout confirmation link is no longer available.'
          : 'Booking confirmation is temporarily unavailable. Please try again.',
      },
      { status: invalidSession ? 404 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
