jest.mock('mongoose', () => {
  class MockObjectId {
    constructor(public value: string) {}
    static isValid(value: unknown) { return /^[a-f\d]{24}$/i.test(String(value)); }
    getTimestamp() { return new Date(0); }
    toString() { return this.value; }
  }
  return { Types: { ObjectId: MockObjectId } };
});
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/openai', () => ({ getOpenAIClient: jest.fn(() => null) }));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({ revalidateStorefrontContent: jest.fn() }));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn() },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));

import {
  PageLinkValidationError,
  validateAndNormalizePageLinks,
} from '@/lib/attractionPages/validatePageLinks';
import { buildTranslationsSetOps } from '@/lib/i18n/autoTranslate';
import { attractionPageTranslationFields } from '@/lib/i18n/translationFields';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mockTourCount = jest.requireMock('@/lib/models/Tour').default.countDocuments as jest.Mock;
const mockPageCount = jest.requireMock('@/lib/models/AttractionPage').default.countDocuments as jest.Mock;
const mockCategoryCount = jest.requireMock('@/lib/models/Category').default.countDocuments as jest.Mock;

const tourId = '507f191e810c19729de860ea';
const pageId = '507f191e810c19729de860eb';
const categoryId = '507f191e810c19729de860ec';

describe('main EEO Pages management helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTourCount.mockResolvedValue(1);
    mockPageCount.mockResolvedValue(1);
    mockCategoryCount.mockResolvedValue(1);
  });

  it('deduplicates and validates linked content against the main EEO catalogue', async () => {
    await expect(validateAndNormalizePageLinks({
      linkedTourIds: [tourId, tourId],
      linkedPageIds: [pageId],
      linkedCategoryIds: [categoryId],
    })).resolves.toEqual({
      linkedTourIds: [tourId],
      linkedPageIds: [pageId],
      linkedCategoryIds: [categoryId],
    });

    expect(mockTourCount).toHaveBeenCalledWith(expect.objectContaining({ $and: expect.any(Array) }));
    expect(mockPageCount).toHaveBeenCalledWith(expect.objectContaining({ $and: expect.any(Array) }));
    expect(mockCategoryCount).toHaveBeenCalledWith(expect.objectContaining({ $and: expect.any(Array) }));
  });

  it('rejects references outside the main catalogue and self links', async () => {
    mockCategoryCount.mockResolvedValue(0);
    await expect(validateAndNormalizePageLinks({ linkedCategoryIds: [categoryId] }))
      .rejects.toThrow('main EEO catalogue');
    await expect(validateAndNormalizePageLinks({ linkedPageIds: [pageId] }, pageId))
      .rejects.toBeInstanceOf(PageLinkValidationError);
  });

  it('updates only translation locale buckets returned by the translator', () => {
    expect(buildTranslationsSetOps({
      ar: { title: 'رحلة سفاري' },
      de: { title: 'Safari-Ausflug' },
    })).toEqual({
      'translations.ar': { title: 'رحلة سفاري' },
      'translations.de': { title: 'Safari-Ausflug' },
    });
    expect(attractionPageTranslationFields.map((field) => field.key)).toEqual(expect.arrayContaining([
      'title', 'description', 'longDescription', 'gridTitle', 'gridSubtitle',
      'highlights', 'features', 'metaTitle', 'metaDescription',
    ]));
  });

  it('keeps legacy Attraction and Category editor breadcrumbs under Pages', () => {
    const header = readFileSync(join(process.cwd(), 'components/admin/Header.tsx'), 'utf8');
    expect(header).toContain("segment === 'attraction-pages' || segment === 'categories'");
    expect(header).toContain("? '/admin/pages'");
  });
});
