import { recordWebhookOutcome } from '@/lib/checkout/webhookOutcomeLog';

const mockUpdateOne = jest.fn();
jest.mock('@/lib/models/WebhookProcessingLog', () => ({
  __esModule: true,
  default: { updateOne: (...args: unknown[]) => mockUpdateOne(...args) },
}));

const event = { id: 'evt_test_1', type: 'payment_intent.succeeded' } as never;
const paymentIntent = {
  id: 'pi_3U1jUODstYVU2pYL2KVDNV95',
  amount: 7560,
  currency: 'usd',
  metadata: { tenant_id: 'el-gouna', customer_email: 'buyer@example.test' },
} as never;

describe('webhook outcome log', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  beforeEach(() => { mockUpdateOne.mockReset().mockResolvedValue({}); consoleError.mockClear(); });
  afterAll(() => consoleError.mockRestore());

  it('records the outcome against the Stripe event id, upserting so a retry cannot duplicate it', async () => {
    await recordWebhookOutcome({ event, paymentIntent, outcome: 'created', created: true, bookingReference: 'ELGO-VDNV95-01-ABCD1234' });

    const [filter, update, options] = mockUpdateOne.mock.calls[0];
    expect(filter).toEqual({ eventId: 'evt_test_1' });
    expect(options).toEqual({ upsert: true });
    expect(update.$set).toMatchObject({
      paymentId: 'pi_3U1jUODstYVU2pYL2KVDNV95',
      tenantId: 'el-gouna',
      outcome: 'created',
      created: true,
      bookingReference: 'ELGO-VDNV95-01-ABCD1234',
      amount: 7560,
    });
  });

  it('shouts when a payment produced no booking — the shape of every incident on this path', async () => {
    await recordWebhookOutcome({ event, paymentIntent, outcome: 'missing_tour_refunded', created: false });

    expect(mockUpdateOne).toHaveBeenCalled();
    const shouted = consoleError.mock.calls.some(([message]) => String(message).includes('PAID BUT NOT BOOKED'));
    expect(shouted).toBe(true);
  });

  it('stays quiet when a booking was created', async () => {
    await recordWebhookOutcome({ event, paymentIntent, outcome: 'created', created: true });
    const shouted = consoleError.mock.calls.some(([message]) => String(message).includes('PAID BUT NOT BOOKED'));
    expect(shouted).toBe(false);
  });

  it('never throws, so logging cannot fail a paid booking', async () => {
    mockUpdateOne.mockRejectedValue(new Error('database unavailable'));
    await expect(
      recordWebhookOutcome({ event, paymentIntent, outcome: 'created', created: true }),
    ).resolves.toBeUndefined();
  });

  it('falls back to the default tenant when a payment carries no brand', async () => {
    const noTenant = { ...(paymentIntent as object), metadata: {} } as never;
    await recordWebhookOutcome({ event, paymentIntent: noTenant, outcome: 'created', created: true });
    expect(mockUpdateOne.mock.calls[0][1].$set.tenantId).toBe('default');
  });
});
