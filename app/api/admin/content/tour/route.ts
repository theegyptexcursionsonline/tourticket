// app/api/admin/content/tour/route.ts
// Fail-closed adapter boundary for the foxes-content-engine tour type.
//
// A sellable Tour requires exact destination/category ownership, authoritative
// pricing, booking options, availability and publication state. The generic
// Content Engine payload does not carry that contract yet. Creating a zero-price
// draft and returning a live URL would be a false publish acknowledgement, so
// this receiver rejects tour writes before any database access.

import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyContentEngine,
  verifyContentEngineTenant,
} from '@/lib/auth/verifyContentEngine';

type IncomingBody = {
  tenantId?: string;
};

async function POSTHandler(req: NextRequest) {
  const authError = verifyContentEngine(req);
  if (authError) return authError;

  let body: IncomingBody;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'JSON body must be an object' }, { status: 400 });
    }
    body = parsed as IncomingBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tenant = verifyContentEngineTenant(body.tenantId);
  if (!tenant.ok) return tenant.response;

  return NextResponse.json(
    {
      error:
        'Tour publishing is unavailable until the receiver can validate exact catalogue relationships, sellable pricing, booking options and availability.',
      code: 'CONTENT_RECEIVER_TOUR_UNSUPPORTED',
    },
    { status: 422 },
  );
}

export const POST = withAdminAudit(POSTHandler);
