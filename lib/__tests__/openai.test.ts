import { getOpenAIClient } from '../openai';

// Mock the openai module
jest.mock('openai', () => {
  return jest.fn().mockImplementation((opts: { apiKey: string }) => ({
    apiKey: opts.apiKey,
    chat: { completions: { create: jest.fn() } },
  }));
});

describe('getOpenAIClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when OPENAI_API_KEY is not set', () => {
    delete process.env.OPENAI_API_KEY;
    // Re-import to reset the singleton
    const { getOpenAIClient: fresh } = jest.requireActual('../openai') as typeof import('../openai');
    // Since the module caches, we need to reset modules
    jest.isolateModules(() => {
      delete process.env.OPENAI_API_KEY;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../openai');
      expect(mod.getOpenAIClient()).toBeNull();
    });
  });

  it('returns an OpenAI client when OPENAI_API_KEY is set', () => {
    jest.isolateModules(() => {
      process.env.OPENAI_API_KEY = 'sk-test-key-123';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../openai');
      const client = mod.getOpenAIClient();
      expect(client).not.toBeNull();
      expect(client.apiKey).toBe('sk-test-key-123');
    });
  });

  it('returns the same instance on subsequent calls (singleton)', () => {
    jest.isolateModules(() => {
      process.env.OPENAI_API_KEY = 'sk-test-key-456';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../openai');
      const client1 = mod.getOpenAIClient();
      const client2 = mod.getOpenAIClient();
      expect(client1).toBe(client2);
    });
  });
});
