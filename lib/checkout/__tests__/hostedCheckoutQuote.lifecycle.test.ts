const mockFind = jest.fn();
const mockUpdateOne = jest.fn();
const mockExists = jest.fn();

jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: {
    find: (...args: unknown[]) => mockFind(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
    exists: (...args: unknown[]) => mockExists(...args),
  },
}));

import {
  hasPaidCheckoutForAttempt,
  listHostedCheckoutsForAttempt,
  markHostedCheckoutClosed,
} from '@/lib/checkout/hostedCheckoutQuote';

const attempt = '123e4567-e89b-42d3-a456-426614174000';

describe('hosted checkout page records', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists every page of the attempt that Stripe has not confirmed closed, even one being replaced', async () => {
    const chain = { sort: jest.fn(), limit: jest.fn(), select: jest.fn(), lean: jest.fn() };
    chain.sort.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);
    chain.lean.mockResolvedValue([{ checkoutSessionId: 'cs_1', quoteBinding: 'a'.repeat(64) }]);
    mockFind.mockReturnValue(chain);
    await expect(listHostedCheckoutsForAttempt({ checkoutAttemptId: attempt }))
      .resolves.toEqual([{ checkoutSessionId: 'cs_1', quoteBinding: 'a'.repeat(64) }]);
    const [filter] = mockFind.mock.calls[0];
    expect(filter).toMatchObject({ checkoutAttemptId: attempt, checkoutClosedAt: { $exists: false } });
    expect(filter).not.toHaveProperty('checkoutSupersededAt');
  });

  it('records a close only for the page named', async () => {
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
    await markHostedCheckoutClosed('cs_1');
    expect(mockUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutSessionId: 'cs_1' }),
      { $set: { checkoutClosedAt: expect.any(Date) } },
    );
  });

  it('sees a paid checkout of the attempt through any payment experience', async () => {
    mockExists.mockResolvedValue({ _id: 'q' });
    await expect(hasPaidCheckoutForAttempt({ checkoutAttemptId: attempt })).resolves.toBe(true);
    const [filter] = mockExists.mock.calls[0];
    expect(filter).toMatchObject({ checkoutAttemptId: attempt, inventoryState: 'converted' });
    expect(filter).not.toHaveProperty('paymentExperience');
  });
});
