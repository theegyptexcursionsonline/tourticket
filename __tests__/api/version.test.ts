/** @jest-environment node */
import { GET, dynamic, runtime } from '@/app/api/version/route';

const originalVersion = Object.getOwnPropertyDescriptor(process, 'version')!;
const originalEnv = { ...process.env };

afterEach(() => {
  Object.defineProperty(process, 'version', originalVersion);
  process.env = { ...originalEnv };
});

describe('/api/version runtime evidence', () => {
  it('reports the actual serving process at request time and never caches it', async () => {
    process.env.COMMIT_REF = 'a'.repeat(40);
    process.env.BRANCH = 'main';
    process.env.NODE_VERSION = '22.0.0';
    for (const version of ['v22.23.4', 'v22.23.5']) {
      Object.defineProperty(process, 'version', { ...originalVersion, value: version });
      const response = GET();
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({ commit: 'a'.repeat(40), branch: 'main', node: version });
    }
    expect(dynamic).toBe('force-dynamic');
    expect(runtime).toBe('nodejs');
  });

  it('returns only public diagnostics when build identity is unavailable', async () => {
    delete process.env.COMMIT_REF;
    delete process.env.BRANCH;
    process.env.CRON_SECRET = 'unit-test-only';
    const response = GET();
    expect(await response.json()).toEqual({ commit: null, branch: null, node: process.version });
  });
});
