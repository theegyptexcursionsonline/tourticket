const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

import { loadWebhookPaymentQuote } from '@/lib/checkout/hostedCheckoutQuote';

const metadata = {
  checkout_experience: 'hosted',
  quote_binding: 'a'.repeat(64),
  checkout_attempt_id: '123e4567-e89b-42d3-a456-426614174000',
};

const leanResult = <T,>(value: T) => ({ lean: jest.fn().mockResolvedValue(value) });

describe('hosted Checkout quote adoption', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an already-bound PaymentIntent quote without changing it', async () => {
    const direct = { paymentIntentId: 'pi_direct', quoteBinding: metadata.quote_binding };
    mockFindOne.mockReturnValueOnce(leanResult(direct));

    await expect(loadWebhookPaymentQuote({
      paymentIntentId: 'pi_direct',
      tenantId: 'default',
      metadata,
    })).resolves.toBe(direct);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('atomically replaces the pre-payment Session key with Stripe’s PaymentIntent', async () => {
    const hosted = {
      _id: 'quote-1',
      paymentIntentId: 'cs_test_hosted',
      checkoutSessionId: 'cs_test_hosted',
      quoteBinding: metadata.quote_binding,
    };
    const adopted = { ...hosted, paymentIntentId: 'pi_hosted' };
    mockFindOne
      .mockReturnValueOnce(leanResult(null))
      .mockReturnValueOnce(leanResult(hosted));
    mockFindOneAndUpdate.mockReturnValueOnce(leanResult(adopted));

    await expect(loadWebhookPaymentQuote({
      paymentIntentId: 'pi_hosted',
      tenantId: 'default',
      metadata,
    })).resolves.toEqual(adopted);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'quote-1', paymentIntentId: 'cs_test_hosted' }),
      { $set: { paymentIntentId: 'pi_hosted' } },
      { new: true },
    );
  });

  it('fails closed when the hosted quote was already rebound', async () => {
    mockFindOne
      .mockReturnValueOnce(leanResult(null))
      .mockReturnValueOnce(leanResult({
        _id: 'quote-1',
        paymentIntentId: 'pi_other',
        checkoutSessionId: 'cs_test_hosted',
      }));

    await expect(loadWebhookPaymentQuote({
      paymentIntentId: 'pi_hosted',
      tenantId: 'default',
      metadata,
    })).resolves.toBeNull();
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reuses a concurrent worker adoption instead of refunding the same payment', async () => {
    const hosted = {
      _id: 'quote-1',
      paymentIntentId: 'cs_test_hosted',
      checkoutSessionId: 'cs_test_hosted',
      quoteBinding: metadata.quote_binding,
    };
    const adopted = { ...hosted, paymentIntentId: 'pi_hosted' };
    mockFindOne
      .mockReturnValueOnce(leanResult(null))
      .mockReturnValueOnce(leanResult(hosted))
      .mockReturnValueOnce(leanResult(adopted));
    mockFindOneAndUpdate.mockReturnValueOnce(leanResult(null));

    await expect(loadWebhookPaymentQuote({
      paymentIntentId: 'pi_hosted',
      tenantId: 'default',
      metadata,
    })).resolves.toEqual(adopted);
    expect(mockFindOne).toHaveBeenLastCalledWith({
      paymentIntentId: 'pi_hosted',
      tenantId: 'default',
    });
  });
});
