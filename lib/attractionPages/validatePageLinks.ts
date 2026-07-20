import { Types } from 'mongoose';
import AttractionPage from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export class PageLinkValidationError extends Error {}

function normalizeIds(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new PageLinkValidationError(`${label} must be an array`);
  const ids = [...new Set(value.map(String))];
  if (ids.length > 100) throw new PageLinkValidationError(`${label} cannot contain more than 100 items`);
  if (ids.some((id) => !Types.ObjectId.isValid(id))) {
    throw new PageLinkValidationError(`${label} contains an invalid item`);
  }
  return ids;
}

export async function validateAndNormalizePageLinks(
  body: Record<string, unknown>,
  currentPageId?: string,
) {
  const includeTours = body.linkedTourIds !== undefined || !currentPageId;
  const includePages = body.linkedPageIds !== undefined || !currentPageId;
  const includeCategories = body.linkedCategoryIds !== undefined || !currentPageId;
  const linkedTourIds = includeTours ? normalizeIds(body.linkedTourIds, 'Tour listings') : [];
  const linkedPageIds = includePages ? normalizeIds(body.linkedPageIds, 'Page listings') : [];
  const linkedCategoryIds = includeCategories ? normalizeIds(body.linkedCategoryIds, 'Category listings') : [];

  if (currentPageId && linkedPageIds.includes(currentPageId)) {
    throw new PageLinkValidationError('A page cannot list itself');
  }

  const [tourCount, pageCount, categoryCount] = await Promise.all([
    linkedTourIds.length
      ? Tour.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: linkedTourIds } }] })
      : 0,
    linkedPageIds.length
      ? AttractionPage.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: linkedPageIds } }] })
      : 0,
    linkedCategoryIds.length
      ? Category.countDocuments({ $and: [DEFAULT_TENANT_FILTER, { _id: { $in: linkedCategoryIds } }] })
      : 0,
  ]);

  if (tourCount !== linkedTourIds.length) {
    throw new PageLinkValidationError('One or more selected tours do not belong to the main EEO catalogue');
  }
  if (pageCount !== linkedPageIds.length) {
    throw new PageLinkValidationError('One or more selected pages do not belong to the main EEO catalogue');
  }
  if (categoryCount !== linkedCategoryIds.length) {
    throw new PageLinkValidationError('One or more selected categories do not belong to the main EEO catalogue');
  }

  return {
    ...(includeTours ? { linkedTourIds } : {}),
    ...(includePages ? { linkedPageIds } : {}),
    ...(includeCategories ? { linkedCategoryIds } : {}),
  };
}
