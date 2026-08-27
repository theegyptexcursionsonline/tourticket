import { getAuthorityToolState } from '@/lib/tools/authority';
import { OFFICIAL_TOOLS, STOREFRONT_TOOL_BRAND, type OfficialToolId } from '@/lib/tools/catalog';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PUBLISHER_TOKEN = 'test-publisher-proof-header-only';
const AUTHORITY_ORIGIN = 'https://api.authority.example';
const AUTHORITY_EMBED_ORIGIN = 'https://tools.authority.example';

function configuredEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env = {
    NODE_ENV: 'test',
    AUTHORITY_ENGINE_URL: AUTHORITY_ORIGIN,
    AUTHORITY_EMBED_ORIGIN,
    AUTHORITY_PUBLISHER_TOKEN: PUBLISHER_TOKEN,
  } as NodeJS.ProcessEnv;
  return Object.assign(env, overrides);
}

function configFor(tool: OfficialToolId, overrides: Record<string, unknown> = {}) {
  return {
    tool,
    embedBase: AUTHORITY_EMBED_ORIGIN,
    links: [{ name: STOREFRONT_TOOL_BRAND.name, url: STOREFRONT_TOOL_BRAND.origin }],
    theme: { name: STOREFRONT_TOOL_BRAND.name, accent: STOREFRONT_TOOL_BRAND.accent },
    attribution: {
      host: STOREFRONT_TOOL_BRAND.host,
      verified: true,
      publisherId: 'eeo-storefront',
      reason: null,
    },
    freshness: { current: true, status: 'current' },
    meta: {
      sourceLabel: 'Official source',
      sourceUrl: 'https://www.experienceegypt.eg/en/home/faq',
      reviewedAt: '2026-08-22',
      validUntil: '2026-08-23',
      confidence: 'Planning guidance',
    },
    ...overrides,
  };
}

describe('server-only Authority tool configuration', () => {
  it('keeps the production CSP on the exact branded embed host only', () => {
    const config = readFileSync(resolve(process.cwd(), 'next.config.ts'), 'utf8');

    expect(config).toContain("normalizedHost === 'tools.egypt-excursionsonline.com'");
    expect(config).toContain('configuredAuthorityEmbedOrigin ?');
    expect(config).not.toContain('foxes-tools-api-production.up.railway.app');
  });

  it('requests every official tool with one exact host and publisher-proof header', async () => {
    const fetchMock = jest.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      const tool = url.pathname.split('/').at(-2) as OfficialToolId;
      expect(url.origin).toBe(AUTHORITY_ORIGIN);
      expect([...url.searchParams.entries()]).toEqual([['host', STOREFRONT_TOOL_BRAND.host]]);
      expect(url.searchParams.has('brand')).toBe(false);
      expect(url.searchParams.has('brandUrl')).toBe(false);
      expect(url.toString()).not.toContain(PUBLISHER_TOKEN);
      expect(init?.cache).toBe('no-store');
      expect(init?.redirect).toBe('error');
      expect(init?.headers).toEqual({
        Accept: 'application/json',
        'X-Publisher-Token': PUBLISHER_TOKEN,
      });
      return { ok: true, json: async () => configFor(tool) } as Response;
    }) as unknown as typeof fetch;

    for (const tool of OFFICIAL_TOOLS) {
      const state = await getAuthorityToolState(tool.id, {
        env: configuredEnv(),
        fetch: fetchMock,
        now: new Date('2026-08-22T12:00:00.000Z'),
      });
      expect(state.ok).toBe(true);
      if (!state.ok) throw new Error('Expected ready Authority state');
      const embedUrl = new URL(state.embedSrc);
      expect(embedUrl.origin).toBe(AUTHORITY_EMBED_ORIGIN);
      expect(embedUrl.pathname).toBe(tool.embedPath);
      expect([...embedUrl.searchParams.entries()]).toEqual([['host', STOREFRONT_TOOL_BRAND.host]]);
      expect(JSON.stringify(state)).not.toContain(PUBLISHER_TOKEN);
    }

    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  it('fails closed before network access when endpoint or token is missing or malformed', async () => {
    const fetchMock = jest.fn() as unknown as typeof fetch;

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({ AUTHORITY_PUBLISHER_TOKEN: '' }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-configured' });

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({ AUTHORITY_ENGINE_URL: '' }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-configured' });

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({ AUTHORITY_EMBED_ORIGIN: '' }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-configured' });

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({ AUTHORITY_ENGINE_URL: 'https://authority.example/?host=evil.example&brand=Forged' }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-configured' });

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({ AUTHORITY_ENGINE_URL: 'https://127.0.0.1' }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-configured' });

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({
          NODE_ENV: 'production',
          AUTHORITY_ENGINE_URL: 'https://foreign-authority.example',
        }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'not-configured' });

    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv({
          NODE_ENV: 'production',
          AUTHORITY_ENGINE_URL: 'https://tools.egypt-excursionsonline.com',
          AUTHORITY_EMBED_ORIGIN: 'https://tools.egypt-excursionsonline.com',
        }),
        fetch: fetchMock,
      }),
    ).resolves.toEqual({ ok: false, reason: 'upstream-unavailable' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects unverified, wrong-host and caller-selected brand responses', async () => {
    const cases = [
      configFor('visa-checker', {
        attribution: { host: STOREFRONT_TOOL_BRAND.host, verified: false, publisherId: null, reason: 'token-missing' },
      }),
      configFor('visa-checker', {
        attribution: { host: 'evil.example', verified: true, publisherId: 'eeo-storefront', reason: null },
      }),
      configFor('visa-checker', {
        theme: { name: 'Forged brand', accent: '#000000' },
        links: [{ name: 'Forged brand', url: 'https://evil.example' }],
      }),
    ];

    for (const body of cases) {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;
      const state = await getAuthorityToolState('visa-checker', {
        env: configuredEnv(),
        fetch: fetchMock,
        now: new Date('2026-08-22T12:00:00.000Z'),
      });
      expect(state.ok).toBe(false);
    }
  });

  it('rejects stale source metadata and an embed origin outside the configured Authority service', async () => {
    const staleFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () =>
        configFor('currency-tipping-guide', {
          freshness: { current: true, status: 'current' },
          meta: {
            sourceLabel: 'Official source',
            sourceUrl: 'https://www.cbe.org.eg/',
            reviewedAt: '2026-08-01',
            validUntil: '2026-08-20',
          },
        }),
    }) as unknown as typeof fetch;
    await expect(
      getAuthorityToolState('currency-tipping-guide', {
        env: configuredEnv(),
        fetch: staleFetch,
        now: new Date('2026-08-22T12:00:00.000Z'),
      }),
    ).resolves.toEqual({ ok: false, reason: 'stale-data' });

    const foreignEmbedFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => configFor('visa-checker', { embedBase: 'https://evil.example' }),
    }) as unknown as typeof fetch;
    await expect(
      getAuthorityToolState('visa-checker', {
        env: configuredEnv(),
        fetch: foreignEmbedFetch,
        now: new Date('2026-08-22T12:00:00.000Z'),
      }),
    ).resolves.toEqual({ ok: false, reason: 'invalid-contract' });
  });

  it('rejects malformed, future or credential-bearing source provenance', async () => {
    const cases = [
      configFor('visa-checker', {
        meta: {
          sourceLabel: 'Official source',
          sourceUrl: 'https://www.experienceegypt.eg/',
          reviewedAt: '2026-02-30',
          validUntil: '2026-08-23',
        },
      }),
      configFor('visa-checker', {
        meta: {
          sourceLabel: 'Official source',
          sourceUrl: 'https://www.experienceegypt.eg/',
          reviewedAt: '2026-08-23',
          validUntil: '2026-08-24',
        },
      }),
      configFor('visa-checker', {
        meta: {
          sourceLabel: 'Official source',
          sourceUrl: 'https://user:secret@www.experienceegypt.eg/',
          reviewedAt: '2026-08-22',
          validUntil: '2026-08-23',
        },
      }),
    ];

    for (const body of cases) {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;
      await expect(
        getAuthorityToolState('visa-checker', {
          env: configuredEnv(),
          fetch: fetchMock,
          now: new Date('2026-08-22T12:00:00.000Z'),
        }),
      ).resolves.toEqual({ ok: false, reason: 'stale-data' });
    }
  });

  it('returns a closed state when Authority is down or rejects the publisher proof', async () => {
    const down = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    await expect(
      getAuthorityToolState('visa-checker', { env: configuredEnv(), fetch: down }),
    ).resolves.toEqual({ ok: false, reason: 'upstream-unavailable' });

    const rejected = jest.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;
    await expect(
      getAuthorityToolState('visa-checker', { env: configuredEnv(), fetch: rejected }),
    ).resolves.toEqual({ ok: false, reason: 'upstream-unavailable' });
  });
});
