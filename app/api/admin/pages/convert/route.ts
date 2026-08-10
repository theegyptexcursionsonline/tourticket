import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import { createUniqueDuplicate, DuplicateIdentityExhaustedError } from '@/lib/admin/contentDuplication';
import {
  buildPageTypeConversionDraft,
  isAllowedCrossModelConversion,
  type AdminPageKind,
} from '@/lib/admin/pageTypeConversion';
import dbConnect from '@/lib/dbConnect';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { sanitizeContentNavigation } from '@/lib/content/contentNavigation';
import {
  ParentPageValidationError,
  validateParentPageSelection,
} from '@/lib/content/validateParentPage';
import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

type SourcePage = Record<string, unknown> & {
  _id?: unknown;
  title?: unknown;
  name?: unknown;
  slug?: unknown;
  pageType?: unknown;
  parentPage?: unknown;
  categoryId?: unknown;
  cityDestination?: unknown;
};

class ConversionRelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionRelationshipError';
  }
}

async function validateConvertedRelationships(targetKind: AdminPageKind, draft: SourcePage): Promise<void> {
  if (draft.urlType === 'city') {
    const cityId = draft.cityDestination ? String(draft.cityDestination) : '';
    const cityCount = cityId
      ? await Destination.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: cityId, archivedAt: null }] })
      : 0;
    if (cityCount !== 1) {
      throw new ConversionRelationshipError('The selected city is unavailable in the main EEO catalogue.');
    }
  }

  if (targetKind === 'category-landing') {
    const categoryId = draft.categoryId ? String(draft.categoryId) : '';
    const categoryCount = categoryId
      ? await Category.countDocuments({
          $and: [DEFAULT_TENANT_FILTER, { _id: categoryId, archivedAt: null }],
        })
      : 0;
    if (categoryCount !== 1) {
      throw new ConversionRelationshipError('The linked Category is unavailable in the main EEO catalogue.');
    }
  }
}

async function POSTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null) as {
    id?: unknown;
    sourceKind?: unknown;
    targetKind?: unknown;
  } | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  const sourceKind = body?.sourceKind as AdminPageKind | undefined;
  const targetKind = body?.targetKind as AdminPageKind | undefined;
  const validKinds: AdminPageKind[] = ['category', 'attraction', 'category-landing'];

  if (!mongoose.Types.ObjectId.isValid(id)
    || !sourceKind
    || !targetKind
    || !validKinds.includes(sourceKind)
    || !validKinds.includes(targetKind)
    || !isAllowedCrossModelConversion(sourceKind, targetKind)) {
    return NextResponse.json({
      success: false,
      error: 'A valid source page, current type, and target type are required',
    }, { status: 400 });
  }

  try {
    await dbConnect();
    const expectedPageType = sourceKind === 'category-landing' ? 'category' : 'attraction';
    const source = sourceKind === 'category'
      ? await Category.findOne({
          $and: [DEFAULT_TENANT_FILTER, { _id: id, archivedAt: null }],
        }).lean<SourcePage | null>()
      : await AttractionPage.findOne({
          $and: [DEFAULT_TENANT_FILTER, { _id: id, pageType: expectedPageType, archivedAt: null }],
        }).lean<SourcePage | null>();

    if (!source) {
      return NextResponse.json({ success: false, error: 'Source page not found' }, { status: 404 });
    }

    const convertedId = new mongoose.Types.ObjectId().toString();
    const converted = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft = buildPageTypeConversionDraft({
          source,
          sourceKind,
          targetKind,
          id: convertedId,
          attempt,
        });
        const navigation = sanitizeContentNavigation(draft);
        if (source.parentPage && !navigation.parentPage) {
          throw new ConversionRelationshipError('The source page has an invalid parent-page relationship.');
        }
        Object.assign(draft, navigation);
        draft.parentPage = await validateParentPageSelection({
          parentPage: navigation.parentPage,
          currentId: convertedId,
          currentSlug: String(draft.slug || ''),
          tenantFilter: DEFAULT_TENANT_FILTER,
        });
        await validateConvertedRelationships(targetKind, draft);
        Object.assign(
          draft,
          await validateAndNormalizePageLinks(
            draft,
            targetKind === 'category'
              ? { currentCategoryId: convertedId, includeTours: false }
              : { currentPageId: convertedId },
          ),
        );
        return draft;
      },
      create: (draft) => targetKind === 'category'
        ? Category.create(draft)
        : AttractionPage.create(draft),
    });

    revalidateStorefrontContent();
    const sourceLabel = String(source.name || source.title || source.slug || id);
    const resourceLabel = String(targetKind === 'category' ? converted.name : converted.title);
    const targetLabel = targetKind === 'category-landing'
      ? 'Category 2'
      : targetKind[0].toUpperCase() + targetKind.slice(1);
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'pages',
      resourceId: String(converted._id),
      resourceLabel,
      summary: `Transferred shared content from ${sourceKind === 'category-landing' ? 'Category 2' : sourceKind} “${sourceLabel}” to a new ${targetLabel} draft “${resourceLabel}”`,
      changedFields: ['pageType', targetKind === 'category' ? 'name' : 'title', 'slug', 'isPublished'],
      tenantIds: ['default'],
      replaceCapturedInput: true,
    });

    const editHref = targetKind === 'category'
      ? `/admin/categories/${String(converted._id)}/edit`
      : `/admin/attraction-pages/${String(converted._id)}/edit`;
    return NextResponse.json({
      success: true,
      data: converted,
      editHref,
      message: `${targetKind === 'category-landing' ? 'Category 2' : targetLabel} draft created with the shared content. Review it before publishing.`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError
      || error instanceof PageLinkValidationError
      || error instanceof ConversionRelationshipError) {
      return NextResponse.json({
        success: false,
        error: `This page cannot be transferred safely: ${error.message}`,
        code: 'SOURCE_RELATIONSHIP_INVALID',
      }, { status: 409 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Page type transfer failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error && error.name === 'ValidationError'
        ? 'The source page contains data that must be corrected before it can be transferred.'
        : 'Failed to transfer page type',
    }, { status: error instanceof Error && error.name === 'ValidationError' ? 422 : 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
