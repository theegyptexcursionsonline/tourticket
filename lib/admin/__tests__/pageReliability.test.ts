import { combinePageFilters } from '../pageFilters';
import { fetchJsonWithRetry } from '../fetchJsonWithRetry';

describe('Pages admin reliability', () => {
  it('preserves tenant, cursor and search OR clauses', () => {
    expect(combinePageFilters(
      { $or: [{ tenantId: 'default' }, { tenantId: null }] },
      { $or: [{ createdAt: { $lt: new Date(0) } }, { _id: { $lt: '1' } }] },
      { $or: [{ title: /safari/i }, { slug: /safari/i }] },
    )).toEqual({ $and: expect.arrayContaining([
      expect.objectContaining({ $or: expect.any(Array) }),
      expect.objectContaining({ $or: expect.any(Array) }),
      expect.objectContaining({ $or: expect.any(Array) }),
    ]) });
  });

  it('retries one transient server failure', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ status: 500, json: async () => ({ success: false }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    const result = await fetchJsonWithRetry<{ success: boolean }>('/api/admin/pages', {}, fetcher as unknown as typeof fetch);
    expect(result.data.success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
