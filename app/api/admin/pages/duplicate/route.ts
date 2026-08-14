import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { registerAdminAuditDetail, withAdminAudit } from '@/lib/admin/adminAudit';
import {
  buildAttractionPageDuplicate,
  buildCategoryDuplicate,
  createUniqueDuplicate,
  DuplicateIdentityExhaustedError,
} from '@/lib/admin/contentDuplication';
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
import { auditStamp } from '@/lib/admin/auditStamp';

type PageKind = 'attraction' | 'category-landing' | 'category';
type SourcePage = Record<string, unknown> & {
  title?: unknown;
  name?: unknown;
  slug?: unknown;
  pageType?: unknown;
  parentPage?: unknown;
  categoryId?: unknown;
  cityDestination?: unknown;
  popularDestinationIds?: unknown;
};

class SourceRelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceRelationshipError';
  }
}

function objectIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map(String).filter(Boolean))];
}

async function validatePageSpecificRelationships(kind: PageKind, draft: SourcePage): Promise<void> {
  const cityId = draft.cityDestination ? String(draft.cityDestination) : '';
  if (draft.urlType === 'city') {
    const cityCount = cityId
      ? await Destination.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: cityId }] })
      : 0;
    if (cityCount !== 1) throw new SourceRelationshipError('The selected city does not belong to the main EEO catalogue.');
  }

  if (kind === 'category-landing') {
    const categoryId = draft.categoryId ? String(draft.categoryId) : '';
    const categoryCount = categoryId
      ? await Category.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: categoryId }] })
      : 0;
    if (categoryCount !== 1) throw new SourceRelationshipError('The linked category does not belong to the main EEO catalogue.');
  }

  if (kind === 'category') {
    const destinationIds = objectIds(draft.popularDestinationIds);
    if (destinationIds.length) {
      const destinationCount = await Destination.countDocuments({
        $and: [DEFAULT_TENANT_FILTER, { _id: { $in: destinationIds } }],
      });
      if (destinationCount !== destinationIds.length) {
        throw new SourceRelationshipError('One or more Popular Destinations do not belong to the main EEO catalogue.');
      }
    }
  }
}

async function POSTHandler(request: NextRequest) {
  const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => null) as { kind?: unknown; id?: unknown } | null;
  const kind = body?.kind as PageKind | undefined;
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!kind || !['attraction', 'category-landing', 'category'].includes(kind) || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'A valid page type and identifier are required' }, { status: 400 });
  }

  try {
    await dbConnect();
    const expectedPageType = kind === 'category-landing' ? 'category' : 'attraction';
    const source = kind === 'category'
      ? await Category.findOne({ $and: [DEFAULT_TENANT_FILTER, { _id: id }] }).lean<SourcePage | null>()
      : await AttractionPage.findOne({
          $and: [DEFAULT_TENANT_FILTER, { _id: id, pageType: expectedPageType }],
        }).lean<SourcePage | null>();
    if (!source) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    const duplicateId = new mongoose.Types.ObjectId().toString();
    const actor = auditStamp({ id: auth.userId, name: auth.name, email: auth.email });
    const duplicate = await createUniqueDuplicate({
      build: async (attempt) => {
        const draft = kind === 'category'
          ? buildCategoryDuplicate(source, { id: duplicateId, attempt, actor })
          : buildAttractionPageDuplicate(source, { id: duplicateId, attempt, actor });
        const navigation = sanitizeContentNavigation(draft);
        if (source.parentPage && !navigation.parentPage) {
          throw new SourceRelationshipError('The source page has an invalid parent-page relationship.');
        }
        Object.assign(draft, navigation);
        draft.parentPage = await validateParentPageSelection({
          parentPage: navigation.parentPage,
          currentId: duplicateId,
          currentSlug: String(draft.slug || ''),
          tenantFilter: DEFAULT_TENANT_FILTER,
        });
        await validatePageSpecificRelationships(kind, draft);
        Object.assign(
          draft,
          await validateAndNormalizePageLinks(draft, kind === 'category'
            ? { currentCategoryId: duplicateId, includeTours: false }
            : { currentPageId: duplicateId }),
        );
        return draft;
      },
      create: (draft) => kind === 'category' ? Category.create(draft) : AttractionPage.create(draft),
    });

    revalidateStorefrontContent();
    const resourceLabel = String(kind === 'category' ? duplicate.name : duplicate.title);
    const sourceLabel = String(source.name || source.title || source.slug || id);
    registerAdminAuditDetail({
      action: 'create',
      resourceType: 'pages',
      resourceId: String(duplicate._id),
      resourceLabel,
      summary: `Duplicated ${kind === 'category-landing' ? 'Category 2' : kind} “${sourceLabel}” as draft “${resourceLabel}”`,
      changedFields: [kind === 'category' ? 'name' : 'title', 'slug', 'isPublished'],
      tenantIds: ['default'],
      replaceCapturedInput: true,
    });

    const editHref = kind === 'category'
      ? `/admin/categories/${String(duplicate._id)}/edit`
      : `/admin/attraction-pages/${String(duplicate._id)}/edit`;
    return NextResponse.json({
      success: true,
      data: duplicate,
      editHref,
      message: 'Draft page copy created. Review its title and URL before publishing.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ParentPageValidationError
      || error instanceof PageLinkValidationError
      || error instanceof SourceRelationshipError) {
      return NextResponse.json({
        success: false,
        error: `The source page cannot be duplicated safely: ${error.message}`,
        code: 'SOURCE_RELATIONSHIP_INVALID',
      }, { status: 409 });
    }
    if (error instanceof DuplicateIdentityExhaustedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    console.error('Page duplication failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error && error.name === 'ValidationError'
        ? 'The source page contains data that must be corrected before it can be duplicated.'
        : 'Failed to duplicate page',
    }, { status: error instanceof Error && error.name === 'ValidationError' ? 422 : 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
