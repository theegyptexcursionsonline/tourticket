import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { emptyTrash, inspectTrash, type TrashKind } from '@/lib/admin/emptyTrash';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

const KINDS: TrashKind[] = ['tour', 'destination', 'category', 'page'];

function readKind(request: NextRequest): TrashKind | null {
  const kind = new URL(request.url).searchParams.get('kind');
  return KINDS.includes(kind as TrashKind) ? (kind as TrashKind) : null;
}

/** Preview: what an Empty trash would remove, and what it would refuse. */
async function GETHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours', 'manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const kind = readKind(request);
  if (!kind) {
    return NextResponse.json({ success: false, error: 'Unknown trash type.' }, { status: 400 });
  }

  await dbConnect();
  const report = await inspectTrash(kind);
  return NextResponse.json({ success: true, ...report });
}

/**
 * Permanently removes the trashed records that are safe to remove. This is
 * irreversible, so it is gated on a super administrator and never touches a
 * record that is still referenced (bookings, tours, blog links).
 */
async function DELETEHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours', 'manageContent'] });
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'super_admin') {
    return NextResponse.json(
      { success: false, error: 'Only a super administrator can permanently delete trashed items.' },
      { status: 403 },
    );
  }

  const kind = readKind(request);
  if (!kind) {
    return NextResponse.json({ success: false, error: 'Unknown trash type.' }, { status: 400 });
  }

  let ids: string[] | undefined;
  try {
    const body = await request.json().catch(() => null);
    if (body && Array.isArray(body.ids)) {
      ids = body.ids.map((id: unknown) => String(id)).slice(0, 200);
    }
  } catch {
    ids = undefined;
  }

  await dbConnect();
  const report = await emptyTrash(kind, ids);

  registerAdminAuditDetail({
    action: 'delete',
    resourceType: `trash:${kind}`,
    summary: `Permanently deleted ${report.deleted.length} trashed ${kind}${report.deleted.length === 1 ? '' : 's'}`
      + (report.blocked.length > 0 ? `; kept ${report.blocked.length} still in use` : ''),
    changedFields: report.deleted,
  });

  if (report.deleted.length > 0) {
    revalidateStorefrontContent();
  }

  return NextResponse.json({ success: true, ...report });
}

export const GET = withAdminAudit(GETHandler);
export const DELETE = withAdminAudit(DELETEHandler);
