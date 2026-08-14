// app/api/categories/[id]/route.ts
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import {
  contentPageAuditAttemptDetail,
  contentPageAuditDetail,
} from '@/lib/admin/contentPageAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import mongoose from 'mongoose';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { ParentPageValidationError, validateParentPageSelection } from '@/lib/content/validateParentPage';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';
import { auditStamp } from '@/lib/admin/auditStamp';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageContent'],
    });
    if (adminAuth instanceof NextResponse) {
      return adminAuth;
    }

    await dbConnect();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const category = await Category.findOne({
      $and: [DEFAULT_TENANT_FILTER, { _id: id }],
    }).lean();

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch category'
    }, { status: 500 });
  }
}

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageContent'],
    });
    if (adminAuth instanceof NextResponse) {
      return adminAuth;
    }

    await dbConnect();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const beforeCategory = await Category.findOne({
      $and: [DEFAULT_TENANT_FILTER, { _id: id }],
    }).lean();
    if (!beforeCategory) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }
    registerAdminAuditDetail(contentPageAuditAttemptDetail({
      kind: 'category page',
      operation: 'update',
      record: beforeCategory,
      resourceId: id,
    }));

    const body = await request.json();
    Object.assign(body, sanitizeContentNavigation(body));
    Object.assign(body, await validateAndNormalizePageLinks(body, {
      currentCategoryId: id,
      includeTours: false,
    }));
    delete body.tenantId;
    delete body.createdBy;
    delete body.updatedBy;

    const editor = auditStamp({
      id: adminAuth.userId,
      name: adminAuth.name,
      email: adminAuth.email,
    });
    if (editor) body.updatedBy = editor;

    if (Object.prototype.hasOwnProperty.call(body, 'parentPage')) {
      body.parentPage = await validateParentPageSelection({
        parentPage: body.parentPage,
        currentId: id,
        currentSlug: body.slug || String(
          (beforeCategory as unknown as { slug?: string }).slug || '',
        ),
        tenantFilter: DEFAULT_TENANT_FILTER,
      });
    }

    // The city URL shape needs a real owning destination to build /{city}/{slug}.
    if (body.urlType === 'city' && !mongoose.Types.ObjectId.isValid(body.cityDestination)) {
      return NextResponse.json({
        success: false,
        error: 'The City URL type requires an owning city (cityDestination).'
      }, { status: 400 });
    }
    
    // Check if slug is being changed and if it conflicts
    if (body.slug) {
      const existingCategory = await Category.findOne({
        $and: [
          DEFAULT_TENANT_FILTER,
          { slug: body.slug, _id: { $ne: id } },
        ],
      });
      
      if (existingCategory) {
        return NextResponse.json({
          success: false,
          error: 'Slug already exists'
        }, { status: 400 });
      }
    }

    const category = await Category.findOneAndUpdate(
      { $and: [DEFAULT_TENANT_FILTER, { _id: id }] },
      body,
      { new: true, runValidators: true }
    ).lean();

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();
    registerAdminAuditDetail(contentPageAuditDetail({
      kind: 'category page',
      operation: 'update',
      before: beforeCategory,
      after: category,
    }));

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);

    if (error instanceof ParentPageValidationError || error instanceof PageLinkValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (mongoError?.code === 11000) {
      const field = Object.keys(mongoError.keyPattern || {}).join(', ') || 'slug';
      return NextResponse.json({
        success: false,
        error: `A page with this URL already exists (${field}). Choose a different value.`,
      }, { status: 409 });
    }
    
    if (error instanceof Error && (error as Error).name === 'ValidationError') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: (error as Error).message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update category'
    }, { status: 500 });
  }
}

async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageContent'],
    });
    if (adminAuth instanceof NextResponse) {
      return adminAuth;
    }

    await dbConnect();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid category ID'
      }, { status: 400 });
    }

    const beforeCategory = await Category.findOne({
      $and: [DEFAULT_TENANT_FILTER, { _id: id }],
    }).lean();
    if (!beforeCategory) {
      return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });
    }

    const category = await Category.findOneAndUpdate({
      $and: [DEFAULT_TENANT_FILTER, { _id: id }],
    }, {
      $set: { isPublished: false, archivedAt: new Date() },
    }, { new: true });

    if (!category) {
      return NextResponse.json({
        success: false,
        error: 'Category not found'
      }, { status: 404 });
    }

    revalidateStorefrontContent();
    registerAdminAuditDetail(contentPageAuditDetail({
      kind: 'category page',
      operation: 'update',
      before: beforeCategory,
      after: category,
    }));

    return NextResponse.json({
      success: true,
      message: 'Category moved to Trash. It can be restored from the Trash filter.'
    });
  } catch (error) {
    console.error('Error moving category to Trash:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to move category to Trash'
    }, { status: 500 });
  }
}

export const PUT = withAdminAudit(PUTHandler);
export const DELETE = withAdminAudit(DELETEHandler);
