import dbConnect from '@/lib/dbConnect';
import { verifyCron } from '@/lib/auth/verifyCron';
import { rekeyTwoFactorSecrets } from '@/lib/auth/twoFactorRekey';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status || 200 }),
  },
}));
jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/auth/verifyCron', () => ({ verifyCron: jest.fn() }));
jest.mock('@/lib/auth/twoFactorRekey', () => ({ rekeyTwoFactorSecrets: jest.fn() }));

const auth = verifyCron as jest.Mock;
const connect = dbConnect as jest.Mock;
const rekey = rekeyTwoFactorSecrets as jest.Mock;

const CURRENT = 'current-two-factor-key-with-32-characters-or-more';
const NEXT = 'next-two-factor-key-with-32-characters-or-more!!';

function request(body: unknown) {
  return { json: async () => body } as never;
}

describe('two-factor rekey cron route', () => {
  const env = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...env, TWO_FACTOR_ENCRYPTION_KEY: CURRENT, TWO_FACTOR_ENCRYPTION_KEY_NEXT: NEXT };
    auth.mockReturnValue(null);
    rekey.mockResolvedValue({ dryRun: true, inspected: 3, rotated: 3, alreadyRotated: 0, undecryptable: 0, conflicted: 0, undecryptableIds: [] });
  });
  afterAll(() => {
    process.env = env;
  });

  it('fails closed before touching the database when cron authentication fails', async () => {
    auth.mockReturnValue({ status: 401, body: { error: 'Unauthorized' } });
    const { POST } = await import('@/app/api/cron/two-factor-rekey/route');

    await expect(POST(request({}))).resolves.toMatchObject({ status: 401 });
    expect(connect).not.toHaveBeenCalled();
    expect(rekey).not.toHaveBeenCalled();
  });

  it('does not exist while no rotation key is configured', async () => {
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY_NEXT;
    const { POST } = await import('@/app/api/cron/two-factor-rekey/route');

    await expect(POST(request({ dryRun: false, confirm: 'rotate-two-factor-key' }))).resolves.toMatchObject({ status: 404 });
    expect(rekey).not.toHaveBeenCalled();
  });

  it('refuses a current key that is missing, short, or identical to the next key', async () => {
    const { POST } = await import('@/app/api/cron/two-factor-rekey/route');
    process.env.TWO_FACTOR_ENCRYPTION_KEY = 'short';
    await expect(POST(request({}))).resolves.toMatchObject({ status: 503 });
    process.env.TWO_FACTOR_ENCRYPTION_KEY = NEXT;
    await expect(POST(request({}))).resolves.toMatchObject({ status: 503 });
    expect(rekey).not.toHaveBeenCalled();
  });

  it('runs a dry run by default and passes both keys through', async () => {
    const { POST } = await import('@/app/api/cron/two-factor-rekey/route');

    await expect(POST(request({}))).resolves.toMatchObject({ status: 200, body: { success: true, rotated: 3 } });
    expect(rekey).toHaveBeenCalledWith({ fromRawKey: CURRENT, toRawKey: NEXT, dryRun: true });
  });

  it('applies only with the confirmation phrase', async () => {
    const { POST } = await import('@/app/api/cron/two-factor-rekey/route');

    await expect(POST(request({ dryRun: false }))).resolves.toMatchObject({ status: 400 });
    expect(rekey).not.toHaveBeenCalled();

    await POST(request({ dryRun: false, confirm: 'rotate-two-factor-key' }));
    expect(rekey).toHaveBeenCalledWith({ fromRawKey: CURRENT, toRawKey: NEXT, dryRun: false });
  });

  it('reports partial success when any value could not be rotated', async () => {
    rekey.mockResolvedValue({ dryRun: false, inspected: 2, rotated: 1, alreadyRotated: 0, undecryptable: 1, conflicted: 0, undecryptableIds: ['u2'] });
    const { POST } = await import('@/app/api/cron/two-factor-rekey/route');

    await expect(POST(request({ dryRun: false, confirm: 'rotate-two-factor-key' }))).resolves.toMatchObject({ status: 207, body: { success: false, undecryptableIds: ['u2'] } });
  });
});
