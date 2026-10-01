import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { withAdminAudit } from '@/lib/admin/adminAudit';
import { authenticateContentEngineMutation, verifyContentEngineMutationTarget, verifyContentEngineTenant } from '@/lib/auth/verifyContentEngine';
import { beginPublish, completePublish, releasePublishClaim, hashPublishRequest, readExpectedRevision, readIdempotencyKey } from '@/lib/content/publishIdempotency';
import { contentReceiverIndexesReady, type ReceiverIndexDatabase } from '@/lib/content/receiverIndexReadiness';
import { tenantFilter } from '@/lib/tenant/tenantScope';

/** Retain a receipt-owned draft as an inaccessible tombstone; never delete content. */
async function PATCHHandler(req: NextRequest) {
  const auth = authenticateContentEngineMutation(req);
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    const value: unknown = await req.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body');
    body = value as Record<string, unknown>;
  } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const targetError = verifyContentEngineMutationTarget(req, auth.credential, {
    method: 'PATCH', receiverType: 'blog', tenantId: body.tenantId, locale: body.defaultLocale,
  });
  if (targetError) return targetError;
  const tenant = verifyContentEngineTenant(body.tenantId);
  if (!tenant.ok) return tenant.response;
  if (!auth.credential.targets.some(target => target.method === 'PATCH' && target.receiverType === 'blog'
    && target.tenantId === body.tenantId && target.locale === body.defaultLocale && target.publicationMode === 'draft')) {
    return NextResponse.json({ error: 'Draft archive grant required' }, { status: 403 });
  }
  const { key, error } = readIdempotencyKey(req.headers.get('idempotency-key'));
  const { revision, error: revisionError } = readExpectedRevision(body.expectedRevision);
  if (error || revisionError || typeof body.id !== 'string' || !/^[a-f0-9]{24}$/i.test(body.id)
    || typeof body.publishReceiptId !== 'string' || !/^[a-f0-9]{24}$/i.test(body.publishReceiptId)) {
    return NextResponse.json({ error: error ?? revisionError ?? 'Valid content and receipt identifiers are required' }, { status: 400 });
  }
  const fingerprint = hashPublishRequest({ grantId: auth.credential.grantId, id: body.id, publishReceiptId: body.publishReceiptId,
    tenantId: tenant.tenantId, locale: body.defaultLocale, expectedRevision: revision });
  const ownership = { _id: body.id, ...tenantFilter(tenant.tenantId),
    contentEnginePublishReceiptId: body.publishReceiptId, contentEngineGrantId: auth.credential.grantId };
  try {
    const connection = await dbConnect();
    if (!(await contentReceiverIndexesReady('blog', connection.connection.db as unknown as ReceiverIndexDatabase))) {
      return NextResponse.json({ error: 'Content receiver indexes are not ready' }, { status: 503 });
    }
    const claim = await beginPublish({ idempotencyKey: key!, tenantId: tenant.tenantId, contentType: 'blog:archive', requestHash: fingerprint });
    if (claim.outcome === 'error') return NextResponse.json({ error: claim.error }, { status: claim.status });
    if (claim.outcome === 'replay') return NextResponse.json(claim.body, { status: claim.status });
    const archived = await Blog.findOneAndUpdate({ ...ownership, status: 'draft', archivedAt: null, __v: revision,
      contentEngineUpdateReceiptId: { $exists: false }, contentEngineArchiveOperationId: { $exists: false } },
    { $set: { archivedAt: new Date(), contentEngineArchiveOperationId: key,
      contentEngineArchiveFingerprint: fingerprint }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (archived) {
      const response = { id: String(archived._id), slug: archived.slug, status: 'archived', revision: archived.__v };
      await completePublish(claim, 200, response);
      return NextResponse.json(response);
    }
    const current = await Blog.findOne(ownership).select('+contentEngineArchiveOperationId +contentEngineArchiveFingerprint');
    if (!current) {
      await releasePublishClaim(claim);
      return NextResponse.json({ error: 'Receiver draft not found' }, { status: 404 });
    }
    if (current.status === 'draft' && current.archivedAt && current.contentEngineArchiveOperationId === key && current.contentEngineArchiveFingerprint === fingerprint) {
      const response = { id: String(current._id), slug: current.slug, status: 'archived', revision: current.__v };
      await completePublish(claim, 200, response);
      return NextResponse.json(response);
    }
    await releasePublishClaim(claim);
    return NextResponse.json({ error: 'Receiver draft state or revision changed' }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'Draft archive is temporarily unavailable' }, { status: 503 });
  }
}
export const PATCH = withAdminAudit(PATCHHandler);
