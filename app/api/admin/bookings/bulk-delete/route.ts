import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

async function POSTHandler(request: NextRequest) {
  // Verify admin authentication (cookie + Authorization header fallback)
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json(
    {
      success: false,
      code: 'BOOKING_DELETION_DISABLED',
      error: 'Bookings cannot be permanently deleted. Process each cancellation or refund through its audited workflow.',
    },
    { status: 409 },
  );
}

export const POST = withAdminAudit(POSTHandler);
