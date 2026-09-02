const mockObjectIdIsValid = jest.fn();
const mockCategoryCountDocuments = jest.fn();
const mockDestinationCountDocuments = jest.fn();

jest.mock('mongoose', () => ({
  __esModule: true,
  default: { Types: { ObjectId: { isValid: (...args: unknown[]) => mockObjectIdIsValid(...args) } } },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: { countDocuments: (...args: unknown[]) => mockCategoryCountDocuments(...args) },
}));
jest.mock('@/lib/models/Destination', () => ({
  __esModule: true,
  default: { countDocuments: (...args: unknown[]) => mockDestinationCountDocuments(...args) },
}));

import {
  TourTaxonomyOwnershipError,
  validateTourTaxonomyOwnership,
} from '@/lib/admin/tourTaxonomyOwnership';

const destinationId = '507f191e810c19729de860ea';
const categoryOne = '507f191e810c19729de860eb';
const categoryTwo = '507f191e810c19729de860ec';

describe('tour taxonomy ownership validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObjectIdIsValid.mockReturnValue(true);
    mockDestinationCountDocuments.mockResolvedValue(1);
    mockCategoryCountDocuments.mockResolvedValue(2);
  });

  it('accepts only references resolved inside the default EEO tenant', async () => {
    await expect(validateTourTaxonomyOwnership({
      destination: destinationId,
      category: [categoryOne, categoryTwo],
    })).resolves.toBeUndefined();

    for (const query of [
      mockDestinationCountDocuments.mock.calls[0][0],
      mockCategoryCountDocuments.mock.calls[0][0],
    ]) {
      expect(query).toEqual(expect.objectContaining({ $and: expect.any(Array) }));
      expect(query.$and[0]).toEqual(expect.objectContaining({ $or: expect.any(Array) }));
    }
  });

  it('rejects a valid-looking destination owned by another tenant', async () => {
    mockDestinationCountDocuments.mockResolvedValue(0);
    await expect(validateTourTaxonomyOwnership({ destination: destinationId }))
      .rejects.toThrow('main EEO catalogue');
    expect(mockCategoryCountDocuments).not.toHaveBeenCalled();
  });

  it('rejects when even one requested category is outside the tenant', async () => {
    mockCategoryCountDocuments.mockResolvedValue(1);
    await expect(validateTourTaxonomyOwnership({ category: [categoryOne, categoryTwo] }))
      .rejects.toBeInstanceOf(TourTaxonomyOwnershipError);
  });

  it('rejects malformed ids before touching the database', async () => {
    mockObjectIdIsValid.mockReturnValue(false);
    await expect(validateTourTaxonomyOwnership({ destination: 'not-an-id' }))
      .rejects.toThrow('Invalid destination ID format');
    expect(mockDestinationCountDocuments).not.toHaveBeenCalled();
  });

  it('allows a partial update that does not change taxonomy', async () => {
    await expect(validateTourTaxonomyOwnership({})).resolves.toBeUndefined();
    expect(mockDestinationCountDocuments).not.toHaveBeenCalled();
    expect(mockCategoryCountDocuments).not.toHaveBeenCalled();
  });
});
