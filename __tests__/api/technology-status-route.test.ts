/**
 * GET /api/technology/status — probes are allowlisted, time-boxed, parallel,
 * fail closed, and cached for a minute.
 */
import { SHOWCASE_CAPABILITIES, STATUS_CACHE_TTL_MS } from '@/lib/showcase/registry';
import {
  evaluateTechnologyStatus,
  getTechnologyStatus,
  resetTechnologyStatusCache,
} from '@/lib/showcase/status';

// jsdom's Response polyfill has no static `json`; mirror the shape the route
// relies on, as the repo's other route tests do.
jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Map<string, string>;
    private data: unknown;

    constructor(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.data = data;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(data, init);
    }

    async json() {
      return this.data;
    }
  }
  return { NextRequest: jest.fn(), NextResponse: MockNextResponse };
});

type Responder = (url: string, init?: RequestInit) => Promise<Response> | Response;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

function fetchWith(byUrl: Record<string, Responder>) {
  const calls: string[] = [];
  const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push(url);
    const responder = byUrl[url] ?? byUrl['*'];
    if (!responder) throw new Error(`unexpected probe ${url}`);
    return responder(url, init);
  });
  return { fetchImpl, calls };
}

const allHealthy: Record<string, Responder> = {
  '*': (url) =>
    url.includes('/api/version')
      ? jsonResponse({ commit: 'abc', branch: 'main' })
      : jsonResponse({ status: 'ok', timestamp: 'now' }),
};

const byId = (payload: { capabilities: { id: string; status: string; tier: string }[] }) =>
  Object.fromEntries(payload.capabilities.map((entry) => [entry.id, entry]));

describe('technology status evaluation', () => {
  beforeEach(() => {
    resetTechnologyStatusCache();
    jest.useRealTimers();
  });

  it('marks accepted capabilities live only when every probe answers 200 with its contract', async () => {
    const { fetchImpl, calls } = fetchWith(allHealthy);
    const payload = await evaluateTechnologyStatus({ fetchImpl, now: () => 1_000 });
    const map = byId(payload);

    expect(map['ai-voice'].status).toBe('live');
    expect(map['ai-search'].status).toBe('live');
    expect(map['online-booking'].status).toBe('live');
    // Preview never reads live, whatever the endpoints say.
    expect(map['mobile-apps']).toMatchObject({ tier: 'preview', status: 'unavailable' });
    expect(payload.checkedAt).toBe(new Date(1_000).toISOString());
    expect(payload.expiresAt).toBe(new Date(1_000 + STATUS_CACHE_TTL_MS).toISOString());

    // Only allowlisted registry urls were contacted, each once.
    const expected = SHOWCASE_CAPABILITIES.flatMap((capability) => capability.probes.map((probe) => probe.url));
    expect(new Set(calls)).toEqual(new Set(expected));
    expect(calls).toHaveLength(new Set(expected).size);
    for (const init of fetchImpl.mock.calls.map((call) => call[1])) {
      expect(init?.redirect).toBe('error');
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('maps a 5xx to unavailable for that capability only', async () => {
    const { fetchImpl } = fetchWith({
      ...allHealthy,
      'https://voice.foxestechnology.com/api/health': () => jsonResponse({ error: 'down' }, 503),
    });
    const map = byId(await evaluateTechnologyStatus({ fetchImpl }));
    expect(map['ai-voice'].status).toBe('unavailable');
    expect(map['ai-search'].status).toBe('live');
    expect(map['online-booking'].status).toBe('live');
  });

  it('maps a 200 whose body misses the contract to unavailable', async () => {
    const { fetchImpl } = fetchWith({
      ...allHealthy,
      'https://foxes-api-production.up.railway.app/api/v1/health': () => jsonResponse({ status: 'degraded' }),
    });
    const map = byId(await evaluateTechnologyStatus({ fetchImpl }));
    // One booking dependency down → the booking capability is not live.
    expect(map['online-booking'].status).toBe('unavailable');
    expect(map['ai-voice'].status).toBe('live');
  });

  it('maps a malformed body and a transport error to unavailable', async () => {
    const { fetchImpl } = fetchWith({
      ...allHealthy,
      'https://search.foxestechnology.com/api/version': () =>
        ({ status: 200, json: async () => { throw new SyntaxError('bad json'); } }) as unknown as Response,
      'https://voice.foxestechnology.com/api/health': () => { throw new TypeError('fetch failed'); },
    });
    const map = byId(await evaluateTechnologyStatus({ fetchImpl }));
    expect(map['ai-search'].status).toBe('unavailable');
    expect(map['ai-voice'].status).toBe('unavailable');
  });

  it('aborts a slow probe at the timeout and does not let it serialize the others', async () => {
    jest.useFakeTimers();
    const { fetchImpl } = fetchWith({
      ...allHealthy,
      'https://voice.foxestechnology.com/api/health': (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    });

    const pending = evaluateTechnologyStatus({ fetchImpl, timeoutMs: 3_000 });
    await jest.advanceTimersByTimeAsync(2_999);
    // Still hanging on the slow probe.
    let settled = false;
    void pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(2);
    const map = byId(await pending);
    expect(map['ai-voice'].status).toBe('unavailable');
    expect(map['ai-search'].status).toBe('live');
    expect(map['online-booking'].status).toBe('live');
  });

  it('caches an observation for 60 s and re-probes once it has expired', async () => {
    const { fetchImpl } = fetchWith(allHealthy);
    let clock = 10_000;
    const now = () => clock;

    const first = await getTechnologyStatus({ fetchImpl, now });
    const probeCount = fetchImpl.mock.calls.length;
    expect(probeCount).toBeGreaterThan(0);

    clock += STATUS_CACHE_TTL_MS - 1;
    const second = await getTechnologyStatus({ fetchImpl, now });
    expect(second).toBe(first);
    expect(fetchImpl.mock.calls.length).toBe(probeCount);

    clock += 2;
    const third = await getTechnologyStatus({ fetchImpl, now });
    expect(third).not.toBe(first);
    expect(third.checkedAt).toBe(new Date(clock).toISOString());
    expect(fetchImpl.mock.calls.length).toBe(probeCount * 2);
  });

  it('shares one in-flight evaluation between concurrent callers', async () => {
    const { fetchImpl } = fetchWith(allHealthy);
    const [a, b] = await Promise.all([getTechnologyStatus({ fetchImpl }), getTechnologyStatus({ fetchImpl })]);
    expect(a).toBe(b);
    const expected = new Set(SHOWCASE_CAPABILITIES.flatMap((capability) => capability.probes.map((probe) => probe.url)));
    expect(fetchImpl.mock.calls.length).toBe(expected.size);
  });
});

describe('GET /api/technology/status', () => {
  beforeEach(() => {
    resetTechnologyStatusCache();
    jest.resetModules();
  });

  it('answers 200 with the capabilities and only the client-safe fields', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = jest.fn(async (url: string | URL | Request) =>
      String(url).includes('/api/version')
        ? jsonResponse({ commit: 'abc' })
        : jsonResponse({ status: 'ok' }),
    ) as typeof fetch;
    try {
      const { GET } = await import('@/app/api/technology/status/route');
      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(typeof body.checkedAt).toBe('string');
      expect(Date.parse(body.expiresAt) - Date.parse(body.checkedAt)).toBe(STATUS_CACHE_TTL_MS);
      expect(body.capabilities.map((entry: { id: string }) => entry.id)).toEqual(
        SHOWCASE_CAPABILITIES.map((capability) => capability.id),
      );
      // No private detail leaks: only id/tier/status/checkedAt per entry.
      for (const entry of body.capabilities) {
        expect(Object.keys(entry).sort()).toEqual(['checkedAt', 'id', 'status', 'tier']);
      }
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
