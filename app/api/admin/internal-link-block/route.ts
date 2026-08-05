import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import InternalLinkBlock from '@/lib/models/InternalLinkBlock';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { sanitizeInternalLinkBlock } from '@/lib/navigation/internalLinks';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { buildDefaultInternalLinks } from '@/lib/navigation/defaultInternalLinks';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const TENANT_ID = 'default';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const document = await InternalLinkBlock.findOne({ tenantId: TENANT_ID }).lean();
    return NextResponse.json({
      success: true,
      data: document ? sanitizeInternalLinkBlock(document) : await buildDefaultInternalLinks(DEFAULT_TENANT_FILTER),
    });
  } catch (error) {
    console.error('Failed to load internal-link block.', error);
    return NextResponse.json({ success: false, error: 'Failed to load internal links.' }, { status: 500 });
  }
}

async function PUTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const value = sanitizeInternalLinkBlock(body);
    if (!value.heading.en) {
      return NextResponse.json({ success: false, error: 'An English section heading is required.' }, { status: 400 });
    }

    await dbConnect();
    const saved = await InternalLinkBlock.findOneAndUpdate(
      { tenantId: TENANT_ID },
      { $set: { ...value, tenantId: TENANT_ID } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();
    revalidateStorefrontContent();
    return NextResponse.json({ success: true, data: sanitizeInternalLinkBlock(saved) });
  } catch (error) {
    console.error('Failed to save internal-link block.', error);
    return NextResponse.json({ success: false, error: 'Failed to save internal links.' }, { status: 500 });
  }
}

export const PUT = withAdminAudit(PUTHandler);
