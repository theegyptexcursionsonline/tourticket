import dbConnect from '@/lib/dbConnect';
import { verifyCron } from '@/lib/auth/verifyCron';
import { runBookingEventMaintenance } from '@/lib/integrations/bookingEventMaintenance';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
  },
}));
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/verifyCron', () => ({ verifyCron: jest.fn() }));
jest.mock('@/lib/integrations/bookingEventMaintenance', () => ({ runBookingEventMaintenance: jest.fn() }));

const auth = verifyCron as jest.Mock;
const connect = dbConnect as jest.Mock;
const maintain = runBookingEventMaintenance as jest.Mock;

describe('booking-event cron route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails closed before database access when cron authentication fails', async () => {
    auth.mockReturnValue({ status: 503, body: { error: 'Cron is not configured' } });
    const { GET } = await import('@/app/api/cron/booking-events/route');

    await expect(GET({} as never)).resolves.toMatchObject({ status: 503 });
    expect(connect).not.toHaveBeenCalled();
    expect(maintain).not.toHaveBeenCalled();
  });

  it('returns success only when reconciliation and delivery have no failed or uncertain work', async () => {
    auth.mockReturnValue(null);
    maintain
      .mockResolvedValueOnce({
        reconciliation: { inspected: 1, enqueued: 1, failed: 0 },
        delivery: { claimed: 1, delivered: 1, retryable: 0, uncertain: 0, failed: 0 },
      })
      .mockResolvedValueOnce({
        reconciliation: { inspected: 0, enqueued: 0, failed: 0 },
        delivery: { claimed: 1, delivered: 0, retryable: 0, uncertain: 1, failed: 0 },
      });
    const { GET } = await import('@/app/api/cron/booking-events/route');

    await expect(GET({} as never)).resolves.toMatchObject({ status: 200, body: { success: true } });
    await expect(GET({} as never)).resolves.toMatchObject({ status: 502, body: { success: false } });
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
