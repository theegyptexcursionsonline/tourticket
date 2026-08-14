import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import {
  buildDestinationDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
} from '@/lib/admin/contentDuplication';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import {
  ParentPageValidationError,
  validateParentPageSelection,
} from '@/lib/content/validateParentPage';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';
import { auditStamp } from '@/lib/admin/auditStamp';

type SourceDestination = Record<string, unknown> & {
  name?: unknown;
  slug?: unknown;
  parentPage?: unknown;
  bestDealTourIds?: unknown;
  topTourIds?: unknown;
};

function tourIds(source: SourceDestination): string[] {
  const values = [source.bestDealTourIds, source.topTourIds]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .map(String)
    .filter(Boolean);
  return [...new Set(values)];
}

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid destination identifier' }, { status: 400 });
  }

  try {
    await dbConnect();
    const source = await Destination.findOne({ $and: [DEFAULT_TENANT_FILTER, { _id: id }] })
      .lean<SourceDestination | null>();
    if (!source) {
      return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
    }

    const linkedTourIds = tourIds(source);
    if (linkedTourIds.length) {
      const count = await Tour.countDocuments({
        $and: [DEFAULT_TENANT_FILTER, { _id: { $in: linkedTourIds } }],
      });
      if (count !== linkedTourIds.length) {
        return NextResponse.json({
          success: false,
          error: 'This destination contains a tour relationship outside the main EEO catalogue. Correct it before duplicating.',
          code: 'SOURCE_RELATIONSHIP_INVALID',
        }, { status: 409 });
      }
    }

    const actor = auditStamp({ id: auth.userId, name: auth.name, email: auth.email });
    const duplicate = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft = buildDestinationDuplicate(source, attempt, actor);
        const navigation = sanitizeContentNavigation(draft);
        if (source.parentPage && !navigation.parentPage) {
          throw new ParentPageValidationError('The source destination has an invalid parent-page relationship.');
        }
        Object.assign(draft, navigation);
        draft.parentPage = await validateParentPageSelection({
          parentPage: navigation.parentPage,
          currentSlug: String(draft.slug || ''),
          tenantFilter: DEFAULT_TENANT_FILTER,
        });
        return draft;
      },
      create: (draft) => Destination.create(draft),
    });

    revalidateStorefrontContent();
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'destinations',
      resourceId: String(duplicate._id),
      resourceLabel: String(duplicate.name || 'Destination copy'),
      summary: `Duplicated destination “${String(source.name || source.slug || id)}” as draft “${String(duplicate.name || '')}”`,
      changedFields: ['name', 'slug', 'isPublished'],
      tenantIds: ['default'],
      replaceCapturedInput: true,
    });

    return NextResponse.json({
      success: true,
      data: duplicate,
      message: 'Draft destination copy created. Review its name and URL before publishing.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Destination duplication failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error && error.name === 'ValidationError'
        ? 'The source destination contains data that must be corrected before it can be duplicated.'
        : 'Failed to duplicate destination',
    }, { status: error instanceof Error && error.name === 'ValidationError' ? 422 : 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
