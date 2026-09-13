import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidatePricingPaths } from '@/lib/revenue/revalidatePricing';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));

describe('pricing cache revalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fail a durable write when cache invalidation throws', () => {
    jest.mocked(revalidatePath).mockImplementationOnce(() => { throw new Error('cache unavailable'); });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(revalidatePricingPaths()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('expires the cached tour lists after a price update', () => {
    expect(revalidatePricingPaths()).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('destination-pages', 'max');
    expect(revalidateTag).toHaveBeenCalledWith('tours-index', 'max');
  });
});
