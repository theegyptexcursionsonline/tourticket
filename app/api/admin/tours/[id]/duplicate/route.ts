import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { auditStamp } from '@/lib/admin/auditStamp';
import {
  buildTourDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
} from '@/lib/admin/contentDuplication';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import {
  ParentPageValidationError,
  validateParentPageSelection,
} from '@/lib/content/validateParentPage';
import { refreshTourPricingSummary } from '@/lib/revenue/pricingSummary';
import { revalidateTourStorefront } from '@/lib/storefront/revalidateTourStorefront';

type SourceTour = Record<string, unknown> & {
  _id?: unknown;
  title?: unknown;
  slug?: unknown;
  destination?: unknown;
  category?: unknown;
  attractions?: unknown;
  interests?: unknown;
  parentPage?: unknown;
};

function ids(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map(String).filter(Boolean))];
}

async function relationshipsBelongToMainTenant(source: SourceTour): Promise<boolean> {
  const destinationId = source.destination ? String(source.destination) : '';
  const categoryIds = ids(source.category);
  const attractionIds = ids(source.attractions);
  const interestIds = ids(source.interests);
  if (!destinationId || categoryIds.length === 0) return false;

  const [destinationCount, categoryCount, attractionCount, interestCount] = await Promise.all([
    Destination.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: destinationId }] }),
    Category.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: categoryIds } }] }),
    attractionIds.length
      ? AttractionPage.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: attractionIds } }] })
      : 0,
    interestIds.length
      ? AttractionPage.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: interestIds } }] })
      : 0,
  ]);

  return destinationCount === 1
    && categoryCount === categoryIds.length
    && attractionCount === attractionIds.length
    && interestCount === interestIds.length;
}

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminAuth(request, { permissions: ['manageTours'] });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid tour identifier' }, { status: 400 });
  }

  try {
    await dbConnect();
    const source = await Tour.findOne({ $and: [DEFAULT_TENANT_FILTER, { _id: id }] })
      .lean<SourceTour | null>();
    if (!source) {
      return NextResponse.json({ success: false, error: 'Tour not found' }, { status: 404 });
    }
    if (!(await relationshipsBelongToMainTenant(source))) {
      return NextResponse.json({
        success: false,
        error: 'This tour contains a destination or page relationship outside the main EEO catalogue. Correct it before duplicating.',
        code: 'SOURCE_RELATIONSHIP_INVALID',
      }, { status: 409 });
    }

    const duplicateId = randomBytes(12).toString('hex');
    const actor = auditStamp({ id: auth.userId, name: auth.name, email: auth.email });
    const duplicate = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft = buildTourDuplicate(source, { id: duplicateId, attempt, actor });
        const navigation = sanitizeContentNavigation(draft);
        if (source.parentPage && !navigation.parentPage) {
          throw new ParentPageValidationError('The source tour has an invalid parent-page relationship.');
        }
        Object.assign(draft, navigation);
        draft.parentPage = await validateParentPageSelection({
          parentPage: navigation.parentPage,
          currentId: duplicateId,
          currentSlug: String(draft.slug || ''),
          tenantFilter: DEFAULT_TENANT_FILTER,
        });
        return draft;
      },
      create: (draft) => Tour.create(draft),
    });

    await refreshTourPricingSummary(String(duplicate._id));
    revalidateTourStorefront();
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'tours',
      resourceId: String(duplicate._id),
      resourceLabel: String(duplicate.title || 'Tour copy'),
      summary: `Duplicated tour “${String(source.title || source.slug || id)}” as draft “${String(duplicate.title || '')}”`,
      changedFields: ['title', 'slug', 'isPublished'],
      tenantIds: ['default'],
      replaceCapturedInput: true,
    });

    return NextResponse.json({
      success: true,
      data: duplicate,
      editHref: `/admin/tours/edit/${String(duplicate._id)}`,
      message: 'Draft tour copy created. Review its title and URL before publishing.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Tour duplication failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error && error.name === 'ValidationError'
        ? 'The source tour contains data that must be corrected before it can be duplicated.'
        : 'Failed to duplicate tour',
    }, { status: error instanceof Error && error.name === 'ValidationError' ? 422 : 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
