import {
  STOREFRONT_TOOL_BRAND,
  getOfficialTool,
  type OfficialToolId,
} from '@/lib/tools/catalog';

const REQUEST_TIMEOUT_MS = 4_000;

type AuthorityFailureReason =
  | 'not-configured'
  | 'upstream-unavailable'
  | 'invalid-contract'
  | 'unverified-publisher'
  | 'stale-data';

export interface AuthoritySourceSummary {
  label: string;
  url: string;
  reviewedAt: string;
  validUntil: string;
  confidence: string | null;
}

export interface AuthorityToolReady {
  ok: true;
  embedSrc: string;
  source: AuthoritySourceSummary;
}

export interface AuthorityToolUnavailable {
  ok: false;
  reason: AuthorityFailureReason;
}

export type AuthorityToolState = AuthorityToolReady | AuthorityToolUnavailable;

interface AuthorityDependencies {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof globalThis.fetch;
  now?: Date;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function configuredOrigin(value: string | undefined, nodeEnv: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const localHttp =
      url.protocol === 'http:' &&
      nodeEnv !== 'production' &&
      ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    const safeProtocol = url.protocol === 'https:' || localHttp;
    const rootOnly = (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
    if (!safeProtocol || !rootOnly || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function dateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCurrentThrough(validUntil: string, now: Date): boolean {
  const cutoff = Date.parse(`${validUntil}T23:59:59.999Z`);
  return Number.isFinite(cutoff) && now.getTime() <= cutoff;
}

function hasFlagshipBrandContract(config: JsonObject): boolean {
  const theme = isObject(config.theme) ? config.theme : null;
  if (!theme || theme.name !== STOREFRONT_TOOL_BRAND.name) return false;

  if (!Array.isArray(config.links) || config.links.length !== 1 || !isObject(config.links[0])) {
    return false;
  }

  const link = config.links[0];
  if (link.name !== STOREFRONT_TOOL_BRAND.name || typeof link.url !== 'string') return false;

  try {
    const url = new URL(link.url);
    return (
      url.origin === STOREFRONT_TOOL_BRAND.origin &&
      (url.pathname === '/' || url.pathname === '') &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function verifiedPublisher(config: JsonObject): boolean {
  const attribution = isObject(config.attribution) ? config.attribution : null;
  return Boolean(
    attribution &&
      attribution.host === STOREFRONT_TOOL_BRAND.host &&
      attribution.verified === true &&
      typeof attribution.publisherId === 'string' &&
      attribution.publisherId.length > 0 &&
      attribution.reason === null,
  );
}

function sourceSummary(config: JsonObject, now: Date): AuthoritySourceSummary | null {
  const meta = isObject(config.meta) ? config.meta : null;
  const freshness = isObject(config.freshness) ? config.freshness : null;
  if (!meta || !freshness || freshness.current !== true || freshness.status !== 'current') return null;

  const sourceUrl = safeSourceUrl(meta.sourceUrl);
  if (
    !sourceUrl ||
    typeof meta.sourceLabel !== 'string' ||
    !meta.sourceLabel.trim() ||
    !dateOnly(meta.reviewedAt) ||
    !dateOnly(meta.validUntil) ||
    !isCurrentThrough(meta.validUntil, now)
  ) {
    return null;
  }

  return {
    label: meta.sourceLabel,
    url: sourceUrl,
    reviewedAt: meta.reviewedAt,
    validUntil: meta.validUntil,
    confidence: typeof meta.confidence === 'string' && meta.confidence.trim() ? meta.confidence : null,
  };
}

function authorityConfigUrl(origin: string, tool: OfficialToolId): URL {
  const url = new URL(`/v1/tools/${tool}/config`, origin);
  // Publisher identity is an exact server-owned constant. Request query values
  // never participate in attribution or brand selection.
  url.searchParams.set('host', STOREFRONT_TOOL_BRAND.host);
  return url;
}

function authorityEmbedUrl(expectedOrigin: string, embedBase: unknown, tool: OfficialToolId): string | null {
  const definition = getOfficialTool(tool);
  if (!definition || typeof embedBase !== 'string') return null;

  try {
    const base = new URL(embedBase);
    if (base.origin !== expectedOrigin || base.username || base.password || base.search || base.hash) return null;
    const url = new URL(definition.embedPath, base.origin);
    url.searchParams.set('host', STOREFRONT_TOOL_BRAND.host);
    return url.toString();
  } catch {
    return null;
  }
}

export async function getAuthorityToolState(
  tool: OfficialToolId,
  dependencies: AuthorityDependencies = {},
): Promise<AuthorityToolState> {
  const env = dependencies.env ?? process.env;
  const origin = configuredOrigin(env.AUTHORITY_ENGINE_URL, env.NODE_ENV);
  const embedOrigin = configuredOrigin(env.AUTHORITY_EMBED_ORIGIN, env.NODE_ENV);
  const publisherToken = env.AUTHORITY_PUBLISHER_TOKEN?.trim();
  const fetchImpl = dependencies.fetch ?? globalThis.fetch;

  if (!origin || !embedOrigin || !publisherToken || typeof fetchImpl !== 'function') {
    return { ok: false, reason: 'not-configured' };
  }

  try {
    const timeoutSignal =
      typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        : undefined;
    const response = await fetchImpl(authorityConfigUrl(origin, tool), {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Publisher-Token': publisherToken,
      },
      signal: timeoutSignal,
    });

    if (!response.ok) return { ok: false, reason: 'upstream-unavailable' };

    const config: unknown = await response.json();
    if (!isObject(config) || config.tool !== tool || !hasFlagshipBrandContract(config)) {
      return { ok: false, reason: 'invalid-contract' };
    }
    if (!verifiedPublisher(config)) return { ok: false, reason: 'unverified-publisher' };

    const source = sourceSummary(config, dependencies.now ?? new Date());
    if (!source) return { ok: false, reason: 'stale-data' };

    const embedSrc = authorityEmbedUrl(embedOrigin, config.embedBase, tool);
    if (!embedSrc) return { ok: false, reason: 'invalid-contract' };

    return { ok: true, embedSrc, source };
  } catch {
    return { ok: false, reason: 'upstream-unavailable' };
  }
}
