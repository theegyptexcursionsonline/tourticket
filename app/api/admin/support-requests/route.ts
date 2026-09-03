import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import BookingSupportRequest from '@/lib/models/BookingSupportRequest';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { recordAdminMutation, withAdminAudit } from '@/lib/admin/adminAudit';

const PAGE_SIZE = 25;
const TENANT_ID = 'default';

/**
 * Ops queue of customer requests registered by FoxesConnect's assistant and
 * confirmed by a FoxesConnect teammate. `proposed` rows (not yet confirmed)
 * are never listed here — operations only ever see approved requests.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;
  await dbConnect();
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const cursor = params.get('cursor');
  if (status && !['received', 'in_progress', 'resolved', 'withdrawn'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 });
  }
  if (cursor && !mongoose.isValidObjectId(cursor)) {
    return NextResponse.json({ success: false, error: 'Invalid cursor' }, { status: 400 });
  }
  const rows = await BookingSupportRequest.find({
    tenantId: TENANT_ID,
    status: status ? status : { $in: ['received', 'in_progress'] },
    ...(cursor ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } } : {}),
  })
    .sort({ _id: -1 })
    .limit(PAGE_SIZE + 1)
    .select('requestId bookingReference actionKind customerRequest language channel status proposedAt confirmedAt confirmedBy resolvedAt resolvedBy resolutionNote booking')
    .lean();
  const page = rows.slice(0, PAGE_SIZE);
  return NextResponse.json(
    {
      success: true,
      requests: page.map((row) => ({
        id: String(row._id),
        requestId: row.requestId,
        bookingId: String(row.booking),
        bookingReference: row.bookingReference,
        actionKind: row.actionKind,
        customerRequest: row.customerRequest,
        language: row.language,
        channel: row.channel,
        status: row.status,
        proposedAt: row.proposedAt,
        confirmedAt: row.confirmedAt ?? null,
        confirmedBy: row.confirmedBy ?? null,
        resolvedAt: row.resolvedAt ?? null,
        resolvedBy: row.resolvedBy ?? null,
        resolutionNote: row.resolutionNote ?? null,
      })),
      nextCursor: rows.length > PAGE_SIZE ? String(page[page.length - 1]._id) : null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

/** Operations progress on a confirmed request: received → in_progress → resolved. Audited. */
async function PATCHHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageBookings'] });
  if (auth instanceof NextResponse) return auth;
  let body: { requestId?: unknown; status?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const requestId = typeof body.requestId === 'string' && /^bsr_[a-f0-9]{24}$/.test(body.requestId) ? body.requestId : null;
  const status = body.status === 'in_progress' || body.status === 'resolved' ? body.status : null;
  const note = typeof body.note === 'string' ? body.note.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
  if (!requestId || !status) return NextResponse.json({ success: false, error: 'requestId and status (in_progress|resolved) are required' }, { status: 400 });
  await dbConnect();
  const from = status === 'in_progress' ? ['received'] : ['received', 'in_progress'];
  const updated = await BookingSupportRequest.findOneAndUpdate(
    { tenantId: TENANT_ID, requestId, status: { $in: from } },
    {
      $set: {
        status,
        ...(status === 'resolved' ? { resolvedAt: new Date(), resolvedBy: auth.email ?? auth.userId ?? 'admin', resolutionNote: note || null } : {}),
      },
    },
    { new: true },
  )
    .select('requestId status bookingReference actionKind')
    .lean();
  await recordAdminMutation(request, auth, {
    action: 'update',
    resourceType: 'booking-support-request',
    resourceId: requestId,
    resourceLabel: updated?.bookingReference,
    summary: updated ? `Support request ${updated.actionKind} → ${status}` : `Rejected transition to ${status}`,
    outcome: updated ? 'succeeded' : 'rejected',
    statusCode: updated ? 200 : 409,
    ...(updated ? {} : { failureCode: 'INVALID_TRANSITION' }),
    fallbackTenantIds: [TENANT_ID],
  });
  if (!updated) {
    const current = await BookingSupportRequest.findOne({ tenantId: TENANT_ID, requestId }).select('status').lean();
    return NextResponse.json({ success: false, error: current ? `Request is ${current.status}` : 'Request not found', ...(current ? { status: current.status } : {}) }, { status: current ? 409 : 404 });
  }
  return NextResponse.json({ success: true, request: { requestId: updated.requestId, status: updated.status } });
}

export const PATCH = withAdminAudit(PATCHHandler);
