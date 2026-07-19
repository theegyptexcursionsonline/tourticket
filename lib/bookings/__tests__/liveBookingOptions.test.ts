import { loadCurrentBookingOptions } from '../liveBookingOptions';

describe('loadCurrentBookingOptions', () => {
  const stale = [{ id: 'option-0', pricingKey: 'stale-key' }];
  const current = [{ id: 'option-0', pricingKey: 'current-key' }];

  it('replaces stale ISR options with the authoritative live options', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => current,
    });

    await expect(loadCurrentBookingOptions('tour-1', stale, fetcher as unknown as typeof fetch))
      .resolves.toEqual(current);
    expect(fetcher).toHaveBeenCalledWith('/api/tours/tour-1/options', { cache: 'no-store' });
  });

  it('keeps page data when the live endpoint is temporarily unavailable', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(loadCurrentBookingOptions('tour-1', stale, fetcher as unknown as typeof fetch))
      .resolves.toEqual(stale);
  });
});
