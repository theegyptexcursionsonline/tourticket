/**
 * Stripe re-emits `payment_intent.payment_failed` for every retry on the same
 * intent, so this notice needs a durable one-shot claim before it can be wired
 * to the webhook at all.
 */
jest.mock('@/lib/models/CheckoutPaymentQuote', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@/lib/email/emailService', () => ({
  __esModule: true,
  EmailService: { sendPaymentFailed: jest.fn() },
}));
jest.mock('@/lib/mailgun', () => ({
  __esModule: true,
  isValidEmailAddress: (value: unknown) => typeof value === 'string' && /.+@.+\..+/.test(value),
}));

import type Stripe from 'stripe';
import CheckoutPaymentQuote from '@/lib/models/CheckoutPaymentQuote';
import { EmailService } from '@/lib/email/emailService';
import { describePaymentFailure, notifyPaymentFailed } from '@/lib/checkout/paymentFailedNotification';

const findOne = CheckoutPaymentQuote.findOne as unknown as jest.Mock;
const updateOne = CheckoutPaymentQuote.updateOne as unknown as jest.Mock;
const sendPaymentFailed = EmailService.sendPaymentFailed as jest.Mock;

function intent(overrides: Record<string, unknown> = {}): Stripe.PaymentIntent {
  return {
    id: 'pi_test_123',
    amount: 24480,
    currency: 'usd',
    created: 1789000000,
    metadata: { customer_email: 'traveller@example.com', customer_name: 'Amira Hassan', tours: 'Nile Dinner Cruise' },
    last_payment_error: { decline_code: 'insufficient_funds' },
    ...overrides,
  } as unknown as Stripe.PaymentIntent;
}

function quoteFound(quote: unknown) {
  findOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(quote) });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  sendPaymentFailed.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('notifyPaymentFailed', () => {
  it('claims the quote before sending, and sends once', async () => {
    quoteFound({ customer: { email: 'traveller@example.com', firstName: 'Amira', lastName: 'Hassan' } });
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    await expect(notifyPaymentFailed(intent())).resolves.toBe('sent');

    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toMatchObject({ paymentIntentId: 'pi_test_123', paymentFailedNotifiedAt: { $exists: false } });
    expect(update.$set).toHaveProperty('paymentFailedNotifiedAt');
    expect(sendPaymentFailed).toHaveBeenCalledTimes(1);
  });

  it('stays silent on a Stripe retry once the claim is taken', async () => {
    quoteFound({ customer: { email: 'traveller@example.com', firstName: 'Amira', lastName: 'Hassan' } });
    updateOne.mockResolvedValue({ modifiedCount: 0 });

    await expect(notifyPaymentFailed(intent())).resolves.toBe('already_handled');
    expect(sendPaymentFailed).not.toHaveBeenCalled();
  });

  it('does not mail when there is no address to mail', async () => {
    quoteFound(null);
    await expect(
      notifyPaymentFailed(intent({ metadata: {} })),
    ).resolves.toBe('no_recipient');
    expect(updateOne).not.toHaveBeenCalled();
    expect(sendPaymentFailed).not.toHaveBeenCalled();
  });

  it('scopes the claim to the paying tenant', async () => {
    quoteFound({ customer: { email: 'traveller@example.com', firstName: 'A', lastName: 'B' } });
    updateOne.mockResolvedValue({ modifiedCount: 1 });

    await notifyPaymentFailed(intent({
      metadata: { customer_email: 'traveller@example.com', tenant_id: 'el-gouna' },
    }));

    expect(findOne.mock.calls[0][0]).toMatchObject({ tenantId: 'el-gouna' });
    expect(updateOne.mock.calls[0][0]).toMatchObject({ tenantId: 'el-gouna' });
  });

  it('keeps the claim after a transport failure rather than risking a duplicate', async () => {
    quoteFound({ customer: { email: 'traveller@example.com', firstName: 'A', lastName: 'B' } });
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    sendPaymentFailed.mockRejectedValueOnce(new Error('mailgun timeout'));

    await expect(notifyPaymentFailed(intent())).resolves.toBe('failed');
    // No $unset anywhere: the claim stands.
    const unsets = updateOne.mock.calls.filter(([, update]) => update?.$unset);
    expect(unsets).toHaveLength(0);
  });
});

describe('describePaymentFailure', () => {
  it.each([
    ['insufficient_funds', /insufficient funds/i],
    ['expired_card', /expired/i],
    ['incorrect_cvc', /security code/i],
    ['authentication_required', /confirm the payment/i],
  ])('turns %s into something a customer can act on', (code, expected) => {
    expect(describePaymentFailure(intent({ last_payment_error: { decline_code: code } }))).toMatch(expected);
  });

  it('never leaks a raw provider code to the reader', () => {
    const message = describePaymentFailure(intent({
      last_payment_error: { code: 'payment_intent_authentication_failure' },
    }));
    expect(message).not.toContain('payment_intent');
    expect(message).not.toContain('_');
    expect(message.length).toBeGreaterThan(20);
  });
});
