import { ReadableStream as NodeReadableStream } from 'node:stream/web';

Object.defineProperty(globalThis, 'ReadableStream', {
  configurable: true,
  value: NodeReadableStream,
});

const mockTranslateStructuredEntity = jest.fn();
const mockDestinationFindOne = jest.fn();
const mockDestinationUpdate = jest.fn();
const mockCategoryFindById = jest.fn();
const mockCategoryUpdate = jest.fn();
const mockAttractionPageFindById = jest.fn();
const mockAttractionPageUpdate = jest.fn();

jest.mock('@/lib/auth/verifyAdmin', () => ({
  verifyAdmin: jest.fn().mockResolvedValue({ id: 'admin-1', role: 'admin' }),
}));
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/storefront/revalidateTourStorefront', () => ({
  revalidateStorefrontContent: jest.fn(),
}));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockDestinationFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockDestinationUpdate(...args),
  },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockCategoryFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockCategoryUpdate(...args),
  },
}));
jest.mock('@/lib/models/AttractionPage', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockAttractionPageFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockAttractionPageUpdate(...args),
  },
}));
jest.mock('@/lib/i18n/autoTranslate', () => {
  const actual = jest.requireActual('@/lib/i18n/autoTranslate');
  return {
    ...actual,
    translateStructuredEntityContentForLocale: (...args: unknown[]) =>
      mockTranslateStructuredEntity(...args),
  };
});

import { POST } from '../route';

describe('POST /api/admin/translate/stream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'destination-1',
        name: 'Cairo',
        description: 'Capital of Egypt',
        climate: 'Hot desert climate',
        weatherWarnings: ['Strong midday sun'],
        averageTemperature: { summer: '35°C', winter: '20°C' },
        faqs: [{ question: 'Is it hot?', answer: 'Yes.' }],
        travelTips: [{ title: 'Water', content: 'Carry water.' }],
        imageMetadata: [{ url: '/cairo.jpg', alt: 'Cairo skyline', title: 'Cairo' }],
      }),
    });
    mockDestinationUpdate.mockResolvedValue({});
    mockCategoryFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'category-1',
        name: 'Adventure Tours',
        description: 'Active experiences',
        faqs: [{ question: 'Who can join?', answer: 'Everyone.' }],
        travelTips: [{ title: 'Book early', content: 'Spaces fill fast.' }],
        imageMetadata: [{ url: '/adventure.jpg', alt: '', title: '' }],
      }),
    });
    mockCategoryUpdate.mockResolvedValue({});
    mockAttractionPageFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'page-1',
        title: 'Pyramids',
        description: 'Explore the pyramids',
        faqs: [{ question: 'Where?', answer: 'Giza.' }],
        travelTips: [{ title: 'Timing', content: 'Go early.' }],
        imageMetadata: [{ url: '/pyramids.jpg', alt: '', title: '' }],
      }),
    });
    mockAttractionPageUpdate.mockResolvedValue({});
    mockTranslateStructuredEntity.mockImplementation(
      async (
        _fields,
        _fieldDefs,
        structuredContent,
        _arraySpecs,
        _objectSpecs,
        _entityLabel,
        locale
      ) => ({
        name: `${locale}-Cairo`,
        ...structuredContent,
      })
    );
  });

  it('passes all destination structured fields through the real streaming path', async () => {
    const response = await POST({
      json: async () => ({ modelType: 'destination', id: 'destination-1' }),
    } as any);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toBe(200);
    expect(mockTranslateStructuredEntity).toHaveBeenCalledTimes(4);

    const structuredContent = mockTranslateStructuredEntity.mock.calls[0][2];
    expect(structuredContent).toMatchObject({
      averageTemperature: { summer: '35°C', winter: '20°C' },
      faqs: [{ question: 'Is it hot?', answer: 'Yes.' }],
      travelTips: [{ title: 'Water', content: 'Carry water.' }],
      imageMetadata: [{
        url: '/cairo.jpg',
        alt: 'Cairo skyline',
        title: 'Cairo',
      }],
    });
    expect(mockDestinationUpdate).toHaveBeenCalledTimes(4);
  });

  it.each([
    {
      modelType: 'category',
      expectedImage: '/adventure.jpg',
      expectedQuestion: 'Who can join?',
      updateMock: mockCategoryUpdate,
    },
    {
      modelType: 'attraction-page',
      expectedImage: '/pyramids.jpg',
      expectedQuestion: 'Where?',
      updateMock: mockAttractionPageUpdate,
    },
  ])(
    'passes FAQs, travel tips, and image SEO through the $modelType streaming path',
    async ({ modelType, expectedImage, expectedQuestion, updateMock }) => {
      await POST({
        json: async () => ({ modelType, id: `${modelType}-1` }),
      } as any);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockTranslateStructuredEntity).toHaveBeenCalledTimes(4);
      const structuredContent = mockTranslateStructuredEntity.mock.calls[0][2];
      expect(structuredContent.faqs[0].question).toBe(expectedQuestion);
      expect(structuredContent.travelTips).toHaveLength(1);
      expect(structuredContent.imageMetadata[0]).toEqual({
        url: expectedImage,
        alt: '',
        title: '',
      });
      expect(updateMock).toHaveBeenCalledTimes(4);
    }
  );
});
