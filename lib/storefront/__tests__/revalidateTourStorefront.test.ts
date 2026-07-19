import { revalidatePath } from 'next/cache';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

describe('storefront cache revalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('purges the complete localized storefront', () => {
    expect(revalidateStorefrontContent()).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
  });

  it('does not fail a completed content write when cache purging throws', () => {
    jest.mocked(revalidatePath).mockImplementationOnce(() => {
      throw new Error('cache unavailable');
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(revalidateStorefrontContent()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
