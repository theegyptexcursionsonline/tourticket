// app/api/admin/blog/route.ts
import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { ensureImageMetadata } from '@/lib/content/imageMetadata';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const posts = await Blog.find({ ...DEFAULT_TENANT_FILTER, archivedAt: null }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts }, { status: 200 });
  } catch (error) {
    console.error('Error listing blog posts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

async function POSTHandler(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const data = await request.json().catch(() => null);
    if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some(key => key.startsWith('$') || key.includes('.') || key.startsWith('contentEngine') || key === 'archivedAt' || key === '__v' || key === '_id')) {
      return NextResponse.json({ success: false, error: 'Protected blog fields cannot be set' }, { status: 400 });
    }
    // Main administration owns the flagship only; clients cannot select another tenant.
    if (![undefined, null, '', 'default'].includes(data.tenantId)) {
      return NextResponse.json({ success: false, error: 'Only default-site blog posts can be created here' }, { status: 400 });
    }
    data.tenantId = 'default';
    data.imageMetadata = ensureImageMetadata(data.imageMetadata, [data.featuredImage, ...(data.images || [])]);
    const created = await Blog.create(data);
    revalidateStorefrontContent();
    return NextResponse.json({ success: true, data: created, message: 'Blog post created' }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating blog post:', error);
    const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue;
    if ((error as { code?: string | number }).code === 11000 && keyValue) {
      const field = Object.keys(keyValue)[0] || 'field';
      return NextResponse.json({ success: false, error: `${field} already exists` }, { status: 400 });
    }
    if ((error as Error).name === 'ValidationError') {
      const messages = Object.values((error as { errors: Record<string, Error> }).errors).map((e) => e.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create blog post' }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
