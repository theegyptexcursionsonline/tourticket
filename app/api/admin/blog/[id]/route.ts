import { validDefaultBlogReferences } from '@/lib/content/blogReferences';
import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Blog from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import mongoose from 'mongoose';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Optional strong revision precondition: exactly a quoted, nonnegative
    // decimal integer (e.g. If-Match: "0"). No wildcard, weak tag or tag list.
    const ifMatch = request.headers.get('if-match');
    const expectedRevision = ifMatch === null ? undefined : Number(ifMatch.slice(1, -1));
    if (ifMatch !== null && (!/^"(?:0|[1-9][0-9]*)"$/.test(ifMatch)
      || !Number.isSafeInteger(expectedRevision) || expectedRevision! >= Number.MAX_SAFE_INTEGER)) {
      return NextResponse.json({ success: false, error: 'Invalid blog revision precondition' }, { status: 400 });
    }
    await dbConnect();
    
    const data = await request.json();
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid blog post ID' 
      }, { status: 400 });
    }
    
    if (!data || typeof data !== 'object' || Array.isArray(data)
      || Object.keys(data).some(key => key.startsWith('$') || key.includes('.') || key.startsWith('contentEngine') || key === 'archivedAt' || key === 'tenantId' || key === '__v' || key === '_id')) {
      return NextResponse.json({ success: false, error: 'Protected blog fields cannot be changed' }, { status: 400 });
    }
    if (!await validDefaultBlogReferences(data)) {
      return NextResponse.json({ success: false, error: 'Invalid related content references' }, { status: 400 });
    }
    const blog = await Blog.findOneAndUpdate(
      { _id: id, ...DEFAULT_TENANT_FILTER, archivedAt: null, ...(expectedRevision !== undefined ? { __v: expectedRevision } : {}) },
      { $set: data, $inc: { __v: 1 } },
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!blog) {
      return NextResponse.json({ 
        success: false, 
        error: expectedRevision === undefined ? 'Blog post not found' : 'Blog revision precondition failed'
      }, { status: expectedRevision === undefined ? 404 : 412 });
    }

    revalidateStorefrontContent();
    
    return NextResponse.json({ 
      success: true, 
      data: blog,
      message: 'Blog post updated successfully' 
    });
  } catch (error: unknown) {
    console.error('Error updating blog post:', error);
    
    if ((error as { code?: string | number }).code === 11000) {
      const field = Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue || {})[0] || 'field';
      return NextResponse.json({ 
        success: false, 
        error: `${field} already exists` 
      }, { status: 400 });
    }
    
    if ((error as Error).name === 'ValidationError') {
      const messages = Object.values((error as { errors: Record<string, Error> }).errors).map((e) => e.message);
      return NextResponse.json({ 
        success: false, 
        error: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update blog post' 
    }, { status: 500 });
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    
    const { id } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid blog post ID' 
      }, { status: 400 });
    }
    
    // Keep receiver receipt ownership and archived natural-key tombstones durable.
    // The predicate is atomic with deletion, including when archive races this call.
    const blog = await Blog.findOneAndDelete({
      _id: id,
      ...DEFAULT_TENANT_FILTER,
      archivedAt: null,
      contentEnginePublishReceiptId: null,
      contentEngineUpdateReceiptId: null,
      contentEngineGrantId: null,
      contentEngineArchiveOperationId: null,
    });
    
    if (!blog) {
      if (await Blog.exists({ _id: id, ...DEFAULT_TENANT_FILTER })) {
        return NextResponse.json({ success: false, error: 'Receiver-owned or archived content must be retained. Use the receiver archive workflow for a private draft.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    revalidateStorefrontContent();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Blog post deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete blog post' 
    }, { status: 500 });
  }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
