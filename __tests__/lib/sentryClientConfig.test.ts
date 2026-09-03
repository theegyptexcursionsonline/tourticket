const mockInit = jest.fn();
const mockReplayIntegration = jest.fn(() => ({ name: 'Replay' }));

jest.mock('@sentry/nextjs', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  replayIntegration: mockReplayIntegration,
  captureRouterTransitionStart: jest.fn(),
}));

describe('client Sentry wiring', () => {
  it('installs the bounded sampling and filtering policy without console-log forwarding', async () => {
    await import('@/instrumentation-client');

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockReplayIntegration).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
      enableLogs: false,
      beforeSend: expect.any(Function),
      tracesSampler: expect.any(Function),
      replaysSessionSampleRate: 0.01,
      replaysOnErrorSampleRate: 0.1,
    }));
  });
});
