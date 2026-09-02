const mockFind = jest.fn();
const mockSelect = jest.fn();
const mockSort = jest.fn();
const mockLimit = jest.fn();
const mockLean = jest.fn();

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { find: (...args: unknown[]) => mockFind(...args) },
}));

import { loadWelcomeTourRecommendations } from '@/lib/auth/welcomeRecommendations';

describe('welcome tour recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const chain = {
      select: mockSelect,
      sort: mockSort,
      limit: mockLimit,
      lean: mockLean,
    };
    mockFind.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockSort.mockReturnValue(chain);
    mockLimit.mockReturnValue(chain);
    mockLean.mockResolvedValue([]);
  });

  it('returns only current public tours from the main tenant, newest first', async () => {
    await loadWelcomeTourRecommendations();

    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({
      $or: expect.arrayContaining([{ tenantId: 'default' }]),
      isPublished: true,
      archivedAt: null,
    }));
    expect(mockSelect).toHaveBeenCalledWith('title slug images discountPrice urlType');
    expect(mockSort).toHaveBeenCalledWith({ updatedAt: -1, _id: -1 });
    expect(mockLimit).toHaveBeenCalledWith(3);
  });

  it('bounds a caller-supplied recommendation count', async () => {
    await loadWelcomeTourRecommendations(99);
    expect(mockLimit).toHaveBeenCalledWith(3);
  });
});
