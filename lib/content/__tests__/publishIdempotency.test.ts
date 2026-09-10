/**
 * Crash-safe idempotency claim helper for content-engine publishes.
 *
 * The receipt collection is mocked so these tests pin claim -> apply ->
 * completion ordering and every replay disposition without external effects.
 */

const receiptCreate = jest.fn();
const receiptFindOne = jest.fn();
const receiptFindOneAndUpdate = jest.fn();
const receiptUpdateOne = jest.fn();
const receiptDeleteOne = jest.fn();

jest.mock('@/lib/models/ContentPublishReceipt', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => receiptCreate(...args),
    findOne: (...args: unknown[]) => receiptFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => receiptFindOneAndUpdate(...args),
    updateOne: (...args: unknown[]) => receiptUpdateOne(...args),
    deleteOne: (...args: unknown[]) => receiptDeleteOne(...args),
  },
}));

import {
  beginPublish,
  completePublish,
  hashPublishRequest,
  readIdempotencyKey,
  receiptTenantId,
  releasePublishClaim,
  type PublishClaim,
} from '../publishIdempotency';

const duplicateKeyError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
const UUID = '9f7d2c8a-1234-4c5d-8e9f-000000000001';
const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });

const input = {
  idempotencyKey: UUID,
  tenantId: 'default',
  contentType: 'blog',
  requestHash: 'hash-1',
};

beforeEach(() => {
  receiptCreate.mockReset();
  receiptFindOne.mockReset();
  receiptFindOneAndUpdate.mockReset();
  receiptUpdateOne.mockReset();
  receiptDeleteOne.mockReset();
});
describe('readIdempotencyKey', () => {
  it('accepts and trims a UUID', () => {
    expect(readIdempotencyKey(`  ${UUID}  `)).toEqual({ key: UUID, error: null });
  });

  it.each([null, undefined, '', '   '])('requires a key for %p', (value) => {
    expect(readIdempotencyKey(value)).toEqual({
      key: null,
      error: 'Idempotency-Key header is required',
    });
  });

  it.each([
    'ordinary-string',
    'x'.repeat(201),
    `bad${String.fromCharCode(0)}key`,
    '9f7d2c8a-1234-4c5d-7e9f-000000000001',
  ])('rejects non-UUID key %p', (value) => {
    expect(readIdempotencyKey(value)).toEqual({
      key: null,
      error: 'Idempotency-Key must be a valid UUID',
    });
  });
});

describe('hashPublishRequest', () => {
  it('is stable regardless of key ordering', () => {
    const a = hashPublishRequest({ tenantId: 'default', payload: { slug: 's', title: 't' } });
    const b = hashPublishRequest({ payload: { title: 't', slug: 's' }, tenantId: 'default' });
    expect(a).toBe(b);
  });

  it('changes when the publish content changes', () => {
    expect(hashPublishRequest({ payload: { slug: 'a' } })).not.toBe(
      hashPublishRequest({ payload: { slug: 'b' } }),
    );
  });
});

describe('receiptTenantId', () => {
  it('normalizes every legacy default spelling to default', () => {
    expect(receiptTenantId(undefined)).toBe('default');
    expect(receiptTenantId('')).toBe('default');
    expect(receiptTenantId('default')).toBe('default');
  });

  it('keeps a real tenant id for backwards-compatible receipt reads', () => {
    expect(receiptTenantId('makadi-bay')).toBe('makadi-bay');
  });
});

describe('beginPublish', () => {
  it('claims a first-seen key before any completion write', async () => {
    receiptCreate.mockResolvedValue({ _id: 'receipt-1' });
    const result = await beginPublish(input);

    expect(result).toEqual(
      expect.objectContaining({ outcome: 'proceed', receiptId: 'receipt-1', resumed: false }),
    );
    expect(receiptCreate).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'pending', tenantId: 'default', contentType: 'blog' }),
    );
    expect(receiptUpdateOne).not.toHaveBeenCalled();
  });

  it('allows only one concurrent caller to proceed for the same indexed key', async () => {
    let inserted = false;
    receiptCreate.mockImplementation(async () => {
      await Promise.resolve();
      if (inserted) throw duplicateKeyError;
      inserted = true;
      return { _id: 'receipt-1' };
    });
    receiptFindOne.mockReturnValue(lean({
      _id: 'receipt-1',
      requestHash: 'hash-1',
      state: 'pending',
    }));
    receiptFindOneAndUpdate.mockReturnValue(lean(null));

    const results = await Promise.all([beginPublish(input), beginPublish(input)]);

    expect(results.filter((result) => result.outcome === 'proceed')).toHaveLength(1);
    expect(results).toContainEqual(
      expect.objectContaining({ outcome: 'error', status: 503 }),
    );
  });

  it('replays the original response for a completed key', async () => {
    receiptCreate.mockRejectedValue(duplicateKeyError);
    receiptFindOne.mockReturnValue(
      lean({
        _id: 'receipt-1',
        requestHash: 'hash-1',
        state: 'completed',
        statusCode: 201,
        response: {
          id: 'blog-1',
          slug: 'a-slug',
          liveUrl: 'https://www.egypt-excursionsonline.com/en/blog/a-slug',
        },
      }),
    );

    await expect(beginPublish(input)).resolves.toEqual({
      outcome: 'replay',
      status: 201,
      body: {
        id: 'blog-1',
        slug: 'a-slug',
        liveUrl: 'https://www.egypt-excursionsonline.com/en/blog/a-slug',
        status: 'published',
        requiresManualPublish: false,
      },
    });
  });

  it('preserves an already explicit completed receiver receipt', async () => {
    receiptCreate.mockRejectedValue(duplicateKeyError);
    receiptFindOne.mockReturnValue(lean({
      _id: 'receipt-1',
      requestHash: 'hash-1',
      state: 'completed',
      statusCode: 201,
      response: {
        id: 'blog-1',
        slug: 'a-slug',
        liveUrl: 'https://www.egypt-excursionsonline.com/en/blog/a-slug',
        status: 'published',
        requiresManualPublish: false,
      },
    }));

    await expect(beginPublish(input)).resolves.toEqual(expect.objectContaining({
      outcome: 'replay',
      body: expect.objectContaining({ status: 'published', requiresManualPublish: false }),
    }));
  });

  it('returns 409 when the key is bound to a different body', async () => {
    receiptCreate.mockRejectedValue(duplicateKeyError);
    receiptFindOne.mockReturnValue(
      lean({ _id: 'receipt-1', requestHash: 'other-hash', state: 'completed' }),
    );
    await expect(beginPublish(input)).resolves.toEqual(
      expect.objectContaining({ outcome: 'error', status: 409 }),
    );
  });

  it('returns 503 while another attempt holds a live claim', async () => {
    receiptCreate.mockRejectedValue(duplicateKeyError);
    receiptFindOne
      .mockReturnValueOnce(lean({ _id: 'receipt-1', requestHash: 'hash-1', state: 'pending' }))
      .mockReturnValueOnce(lean({ state: 'pending' }));
    receiptFindOneAndUpdate.mockReturnValue(lean(null));

    await expect(beginPublish(input)).resolves.toEqual(
      expect.objectContaining({ outcome: 'error', status: 503 }),
    );
  });

  it('takes over a stale claim with the same durable receipt id', async () => {
    receiptCreate.mockRejectedValue(duplicateKeyError);
    receiptFindOne.mockReturnValue(
      lean({ _id: 'receipt-1', requestHash: 'hash-1', state: 'pending' }),
    );
    receiptFindOneAndUpdate.mockReturnValue(lean({ _id: 'receipt-1' }));

    await expect(beginPublish(input)).resolves.toEqual(
      expect.objectContaining({ outcome: 'proceed', receiptId: 'receipt-1', resumed: true }),
    );
  });

  it('replays when the in-flight attempt completes during recovery', async () => {
    receiptCreate.mockRejectedValue(duplicateKeyError);
    receiptFindOne
      .mockReturnValueOnce(lean({ _id: 'receipt-1', requestHash: 'hash-1', state: 'pending' }))
      .mockReturnValueOnce(lean({ state: 'completed', statusCode: 201, response: { id: 'b1' } }));
    receiptFindOneAndUpdate.mockReturnValue(lean(null));

    await expect(beginPublish(input)).resolves.toEqual({
      outcome: 'replay',
      status: 201,
      body: { id: 'b1' },
    });
  });

  it('rethrows non-duplicate database errors instead of publishing blind', async () => {
    receiptCreate.mockRejectedValue(new Error('connection lost'));
    await expect(beginPublish(input)).rejects.toThrow('connection lost');
  });
});

describe('completePublish and releasePublishClaim', () => {
  const claim: PublishClaim = {
    outcome: 'proceed',
    receiptId: 'receipt-1',
    claimToken: 'token-1',
    resumed: false,
  };

  it('marks completion only for the token that owns the claim', async () => {
    receiptUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    await completePublish(claim, 201, { id: 'blog-1' });

    expect(receiptUpdateOne).toHaveBeenCalledWith(
      { _id: 'receipt-1', claimToken: 'token-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          state: 'completed',
          statusCode: 201,
          response: { id: 'blog-1' },
        }),
      }),
    );
  });

  it('fails closed when completion no longer owns the receipt', async () => {
    receiptUpdateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(completePublish(claim, 201, { id: 'blog-1' })).rejects.toThrow(
      'claim was lost',
    );
  });

  it('drops a claim only when no content write committed', async () => {
    receiptDeleteOne.mockResolvedValue({});
    await releasePublishClaim(claim);
    expect(receiptDeleteOne).toHaveBeenCalledWith({
      _id: 'receipt-1',
      claimToken: 'token-1',
      state: 'pending',
    });
  });
});
