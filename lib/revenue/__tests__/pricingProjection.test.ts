jest.mock('@/lib/algolia', () => ({
  syncTourToAlgoliaVerified: jest.fn(),
  deleteTourFromAlgolia: jest.fn(),
}));

jest.mock('@/lib/models/RevenuePriceOverride', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), find: jest.fn(), updateOne: jest.fn() },
}));

import Tour from '@/lib/models/Tour';
import { syncTourToAlgoliaVerified } from '@/lib/algolia';
import {
  pricingProjectionRetryDelayMs,
  refreshExpiredPricingSummaries,
  syncTourPricingSearchIndex,
} from '@/lib/revenue/pricingSummary';

const mockFindOne = Tour.findOne as jest.Mock;
const mockFind = Tour.find as jest.Mock;
const mockUpdateOne = Tour.updateOne as jest.Mock;
const mockSyncTourToAlgolia = syncTourToAlgoliaVerified as jest.Mock;

const leanResult = <T>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });
const findResult = <T>(value: T) => ({
  select: jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnValue(leanResult(value)),
  }),
});

describe('durable pricing search projection', () => {
  const originalAppId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const originalWriteKey = process.env.ALGOLIA_WRITE_API_KEY;
  const originalSkip = process.env.REVENUEPILOT_SKIP_SEARCH_SYNC;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = 'test-app';
    process.env.ALGOLIA_WRITE_API_KEY = 'test-write-key';
    delete process.env.REVENUEPILOT_SKIP_SEARCH_SYNC;
    mockUpdateOne.mockResolvedValue({ acknowledged: true });
    mockFindOne.mockReturnValue(leanResult({
      _id: 'tour-1',
      isPublished: true,
      pricingSummary: { version: 4 },
      pricingSearchProjection: { summaryVersion: 4, attempts: 1 },
    }));
  });

  afterAll(() => {
    if (originalAppId === undefined) delete process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    else process.env.NEXT_PUBLIC_ALGOLIA_APP_ID = originalAppId;
    if (originalWriteKey === undefined) delete process.env.ALGOLIA_WRITE_API_KEY;
    else process.env.ALGOLIA_WRITE_API_KEY = originalWriteKey;
    if (originalSkip === undefined) delete process.env.REVENUEPILOT_SKIP_SEARCH_SYNC;
    else process.env.REVENUEPILOT_SKIP_SEARCH_SYNC = originalSkip;
  });

  it('persists a failed delivery with an automatic retry time', async () => {
    mockSyncTourToAlgolia.mockRejectedValueOnce(new Error('temporary outage'));

    await expect(syncTourPricingSearchIndex('tour-1')).resolves.toBe(false);

    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'tour-1', 'pricingSearchProjection.summaryVersion': 4 }),
      expect.objectContaining({
        $set: expect.objectContaining({
          'pricingSearchProjection.status': 'failed',
          'pricingSearchProjection.lastErrorCode': 'ALGOLIA_SYNC_FAILED',
          'pricingSearchProjection.nextAttemptAt': expect.any(Date),
        }),
      }),
    );
  });

  it('marks the matching summary version verified only after Algolia accepts it', async () => {
    mockSyncTourToAlgolia.mockResolvedValueOnce(undefined);

    await expect(syncTourPricingSearchIndex('tour-1')).resolves.toBe(true);

    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'tour-1', 'pricingSearchProjection.summaryVersion': 4 }),
      expect.objectContaining({
        $set: expect.objectContaining({
          'pricingSearchProjection.status': 'verified',
          'pricingSearchProjection.syncedAt': expect.any(Date),
        }),
      }),
    );
  });

  it('drains failed deliveries whose retry deadline has elapsed', async () => {
    mockFind.mockReturnValueOnce(findResult([])).mockReturnValueOnce(findResult([{ _id: 'tour-1' }]));
    mockSyncTourToAlgolia.mockResolvedValueOnce(undefined);

    const result = await refreshExpiredPricingSummaries(25);

    expect(result).toMatchObject({ refreshed: 0, projectionAttempts: 1 });
    expect(result.results).toEqual([{ tourId: 'tour-1', searchSynced: true }]);
    expect(mockFind.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      $or: expect.arrayContaining([
        expect.objectContaining({
          'pricingSearchProjection.status': 'failed',
          'pricingSearchProjection.nextAttemptAt': expect.any(Object),
        }),
      ]),
    }));
  });

  it('uses bounded exponential backoff', () => {
    expect(pricingProjectionRetryDelayMs(1)).toBe(60_000);
    expect(pricingProjectionRetryDelayMs(2)).toBe(120_000);
    expect(pricingProjectionRetryDelayMs(99)).toBe(3_600_000);
  });
});
