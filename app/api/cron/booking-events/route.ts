import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { verifyCron } from '@/lib/auth/verifyCron';
import { runBookingEventMaintenance } from '@/lib/integrations/bookingEventMaintenance';

export async function GET(request: NextRequest) {
  const authError = verifyCron(request);
  if (authError) return authError;

  try {
    await dbConnect();
    const result = await runBookingEventMaintenance();
    const success = result.reconciliation.failed === 0
      && result.delivery.retryable === 0
      && result.delivery.uncertain === 0
      && result.delivery.failed === 0;
    return NextResponse.json({ success, ...result }, { status: success ? 200 : 502 });
  } catch (error) {
    console.error('FoxesConnect booking-event maintenance failed.', {
      code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
    });
    return NextResponse.json(
      { success: false, error: 'Booking-event maintenance failed.' },
      { status: 500 },
    );
  }
}
