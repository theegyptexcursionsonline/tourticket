/**
 * @jest-environment node
 *
 * A server-side scheduled function, exercised in the node environment so its
 * `Response` is the real one the Netlify runtime provides — jsdom's cannot
 * carry a body, so a body assertion there proves nothing.
 *
 * The scheduled function must ship disabled.
 *
 * EEO web has no acceptance-recipient redirect, so the first enabled run mails
 * real travellers. Merging a schedule must not be what starts that — only the
 * owner setting `LIFECYCLE_EMAILS_ENABLED=true` may.
 *
 * `fetch` is stubbed throughout: nothing here can reach the cron routes, and
 * therefore nothing here can send mail.
 */
import dailyCustomerMail, {
  LIFECYCLE_FLAG,
  lifecycleEmailsEnabled,
} from '../daily-customer-mail.mjs';

const ORIGINAL_ENV = { ...process.env };
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, matched: 0, sent: 0, failed: 0, skipped: 0 }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.CRON_SECRET = 'test-cron-secret-not-a-real-value';
  delete process.env[LIFECYCLE_FLAG];
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.restoreAllMocks();
});

describe('disabled by default', () => {
  it('is a no-op when the flag is unset', async () => {
    const response = await dailyCustomerMail();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      skipped: true,
      reason: 'lifecycle_emails_disabled',
    });
  });

  it('exits cleanly and says it is disabled, rather than erroring', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await dailyCustomerMail();

    expect(response.status).toBe(200);
    expect(error).not.toHaveBeenCalled();
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('LIFECYCLE_EMAILS_DISABLED');
    expect(logged).toContain(LIFECYCLE_FLAG);
  });

  it('stays off even when the cron secret is missing — off is not misconfigured', async () => {
    delete process.env.CRON_SECRET;

    const response = await dailyCustomerMail();

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['false', 'false'],
    ['0', '0'],
    ['1', '1'],
    ['yes', 'yes'],
    ['on', 'on'],
    ['TRUE-ish typo', 'truthy'],
  ])('treats %s as off — only the exact string "true" enables it', async (_label, value) => {
    if (value === undefined) delete process.env[LIFECYCLE_FLAG];
    else process.env[LIFECYCLE_FLAG] = value;

    await dailyCustomerMail();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('enabled explicitly', () => {
  it.each([['true'], ['TRUE'], [' true ']])('runs both jobs when the flag is %s', async (value) => {
    process.env[LIFECYCLE_FLAG] = value;

    const response = await dailyCustomerMail();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/cron/trip-reminders');
    expect(fetchMock.mock.calls[1][0]).toContain('/api/cron/trip-completion');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });

  it('authenticates each call with the cron secret', async () => {
    process.env[LIFECYCLE_FLAG] = 'true';

    await dailyCustomerMail();

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers.authorization).toBe('Bearer test-cron-secret-not-a-real-value');
      expect(init.redirect).toBe('error');
    }
  });

  it('refuses to run unauthenticated when the secret is missing', async () => {
    process.env[LIFECYCLE_FLAG] = 'true';
    delete process.env.CRON_SECRET;

    const response = await dailyCustomerMail();

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a bad gateway when a job fails, and logs counts without addresses', async () => {
    process.env[LIFECYCLE_FLAG] = 'true';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ success: false, matched: 3, sent: 1, failed: 2, skipped: 0 }),
    });

    const response = await dailyCustomerMail();

    expect(response.status).toBe(502);
    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('"failed":2');
    expect(logged).not.toMatch(/@/);
  });
});

describe('lifecycleEmailsEnabled', () => {
  it('reads the same flag name eeo-backend uses', () => {
    expect(LIFECYCLE_FLAG).toBe('LIFECYCLE_EMAILS_ENABLED');
  });

  it('defaults to off for an empty environment', () => {
    expect(lifecycleEmailsEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('is on only for "true"', () => {
    expect(lifecycleEmailsEnabled({ LIFECYCLE_EMAILS_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(lifecycleEmailsEnabled({ LIFECYCLE_EMAILS_ENABLED: 'false' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});
