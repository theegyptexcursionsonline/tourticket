/** @jest-environment node */
import bookingEventMaintenance from '../booking-event-maintenance.mjs';
import keepWarm from '../keep-warm.mjs';
import revenueMaintenance from '../revenue-maintenance.mjs';
import dailyCustomerMail from '../daily-customer-mail.mjs';
import { logNodeRuntime } from '../../lib/node-runtime.mjs';

const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const originalVersion = Object.getOwnPropertyDescriptor(process, 'version')!;

beforeEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.LIFECYCLE_EMAILS_ENABLED;
  global.fetch = jest.fn().mockResolvedValue({ status: 200 });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  Object.defineProperty(process, 'version', originalVersion);
  jest.restoreAllMocks();
});

it.each([
  ['booking-event-maintenance', bookingEventMaintenance, 503, 0],
  ['keep-warm', keepWarm, 200, 2],
  ['revenue-maintenance', revenueMaintenance, 503, 0],
  ['daily-customer-mail', dailyCustomerMail, 200, 0],
] as const)('attests %s before any existing guard or work', async (name, handler, status, fetchCalls) => {
  const response = await handler();
  expect(response.status).toBe(status);
  expect(global.fetch).toHaveBeenCalledTimes(fetchCalls);
  expect(console.log).toHaveBeenNthCalledWith(1, '[node-runtime] ' + JSON.stringify({ function: name, node: process.version }));
});

it('reads each invocation from process.version and logs no environment secrets', () => {
  process.env.CRON_SECRET = 'unit-test-only';
  process.env.NODE_VERSION = '22.0.0';
  for (const version of ['v22.23.4', 'v22.23.5']) {
    Object.defineProperty(process, 'version', { ...originalVersion, value: version });
    logNodeRuntime('keep-warm');
    expect(console.log).toHaveBeenLastCalledWith('[node-runtime] ' + JSON.stringify({ function: 'keep-warm', node: version }));
  }
});
