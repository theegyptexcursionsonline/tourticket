export {};

const mockInit = jest.fn();

jest.mock('@sentry/nextjs', () => ({
  init: (...args: unknown[]) => mockInit(...args),
}));

describe('server and edge monitoring wiring', () => {
  const originalContext = process.env.SENTRY_DEPLOY_CONTEXT;

  afterEach(() => {
    mockInit.mockClear();
    jest.resetModules();
    if (originalContext === undefined) delete process.env.SENTRY_DEPLOY_CONTEXT;
    else process.env.SENTRY_DEPLOY_CONTEXT = originalContext;
  });

  it.each(['@/sentry.server.config', '@/sentry.edge.config'])(
    '%s stays silent outside a production deploy and ignores the unparseable router header',
    async (modulePath) => {
      process.env.SENTRY_DEPLOY_CONTEXT = 'production';
      await import(modulePath);

      expect(mockInit).toHaveBeenCalledTimes(1);
      const options = mockInit.mock.calls[0][0];
      // NODE_ENV is "test" here: even a production context must not enable reporting.
      expect(options.enabled).toBe(false);
      expect(options.ignoreErrors.some((pattern: RegExp) =>
        pattern.test('The router state header was sent but could not be parsed.'))).toBe(true);
    },
  );
});
