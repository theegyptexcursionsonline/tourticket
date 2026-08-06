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

type ValidatedTourRelationships = {
  source: SourceTour;
  omittedOptionalRelationshipCount: number;
};

async function validateAndSanitizeRelationships(
  source: SourceTour,
): Promise<ValidatedTourRelationships | null> {
  const destinationId = source.destination ? String(source.destination) : '';
  const categoryIds = ids(source.category);
  const attractionIds = ids(source.attractions);
  const interestIds = ids(source.interests);
  if (!destinationId || categoryIds.length === 0) return null;

  const optionalPageIds = [...new Set([...attractionIds, ...interestIds])];

  const [destinationCount, categoryCount, allowedOptionalPageIds] = await Promise.all([
    Destination.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: destinationId }] }),
    Category.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: categoryIds } }] }),
    optionalPageIds.length
      ? AttractionPage.distinct('_id', {
        $and: [DEFAULT_TENANT_FILTER, { _id: { $in: optionalPageIds } }],
      })
      : [],
  ]);

  // Destination and category are required ownership relationships. A copy must
  // fail closed if either points outside the main catalogue. Attractions and
  // interests are optional curation links; legacy tours can retain deleted or
  // formerly cross-tenant ids. Carry only ids that still resolve inside the
  // main tenant so old tours remain copyable without leaking foreign content.
  if (destinationCount !== 1 || categoryCount !== categoryIds.length) return null;

  const allowed = new Set(allowedOptionalPageIds.map(String));
  const safeAttractionIds = attractionIds.filter((id) => allowed.has(id));
  const safeInterestIds = interestIds.filter((id) => allowed.has(id));
  const sanitizedSource: SourceTour = { ...source };
  if (source.attractions !== undefined) sanitizedSource.attractions = safeAttractionIds;
  if (source.interests !== undefined) sanitizedSource.interests = safeInterestIds;

  return {
    source: sanitizedSource,
    omittedOptionalRelationshipCount:
      attractionIds.length - safeAttractionIds.length
      + interestIds.length - safeInterestIds.length,
  };
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
    const relationships = await validateAndSanitizeRelationships(source);
    if (!relationships) {
      return NextResponse.json({
        success: false,
        error: 'This tour contains a required destination or category relationship outside the main EEO catalogue. Correct it before duplicating.',
        code: 'SOURCE_RELATIONSHIP_INVALID',
      }, { status: 409 });
    }

    const duplicateSource = relationships.source;

    const duplicateId = randomBytes(12).toString('hex');
    const actor = auditStamp({ id: auth.userId, name: auth.name, email: auth.email });
    const duplicate = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft = buildTourDuplicate(duplicateSource, { id: duplicateId, attempt, actor });
        const navigation = sanitizeContentNavigation(draft);
        if (duplicateSource.parentPage && !navigation.parentPage) {
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
    const omittedCount = relationships.omittedOptionalRelationshipCount;
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'tours',
      resourceId: String(duplicate._id),
      resourceLabel: String(duplicate.title || 'Tour copy'),
      summary: `Duplicated tour “${String(source.title || source.slug || id)}” as draft “${String(duplicate.title || '')}”${omittedCount > 0 ? `; omitted ${omittedCount} unavailable optional page ${omittedCount === 1 ? 'link' : 'links'}` : ''}`,
      changedFields: omittedCount > 0
        ? ['title', 'slug', 'isPublished', 'attractions', 'interests']
        : ['title', 'slug', 'isPublished'],
      tenantIds: ['default'],
      replaceCapturedInput: true,
    });

    const omissionMessage = omittedCount > 0
      ? ` ${omittedCount} unavailable optional page ${omittedCount === 1 ? 'link was' : 'links were'} omitted.`
      : '';

    return NextResponse.json({
      success: true,
      data: duplicate,
      editHref: `/admin/tours/edit/${String(duplicate._id)}`,
      message: `Draft tour copy created.${omissionMessage} Review its title and URL before publishing.`,
      warnings: omittedCount > 0
        ? [{
          code: 'OPTIONAL_RELATIONSHIPS_OMITTED',
          count: omittedCount,
          message: `${omittedCount} unavailable optional page ${omittedCount === 1 ? 'link was' : 'links were'} not copied.`,
        }]
        : [],
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
