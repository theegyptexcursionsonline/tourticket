/**
 * Technology showcase registry — the single client-safe manifest behind
 * `/[locale]/technology` and `GET /api/technology/status`.
 *
 * Every visible capability is listed here deliberately. A capability's `tier`
 * is a reviewed decision, never inferred from an endpoint answering: `accepted`
 * capabilities may show "Live" when every probe answers; `preview` ones show
 * "Preview" no matter what any endpoint says. Probes are fixed, first-party,
 * public, secret-free URLs whose hosts must sit on the allowlist below — the
 * status route never accepts a request-supplied URL.
 *
 * Nothing in this file may name an internal identity, environment, or
 * deployment identifier: it ships in the public bundle.
 */
import { SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

export type CapabilityTier = 'accepted' | 'preview';

export type CapabilityId = 'ai-voice' | 'ai-search' | 'online-booking' | 'mobile-apps';

/** Shape a probe must answer with to count as healthy. */
export type ProbeContract =
  /** HTTP 200 with JSON `{ status: "ok" }`. */
  | { kind: 'status-ok' }
  /** HTTP 200 with a JSON object (a version/build discriminator). */
  | { kind: 'json-object' };

export interface ProbeTarget {
  /** Stable, client-safe label for the dependency. */
  id: string;
  url: string;
  contract: ProbeContract;
}

export interface ShowcaseCapability {
  id: CapabilityId;
  tier: CapabilityTier;
  /** Key into the page's localized copy table. */
  copyKey: CapabilityId;
  /** Ordinary in-site destination for the card's link (accepted tier only). */
  href: string | null;
  /** Every probe must answer for an accepted capability to read "Live". */
  probes: readonly ProbeTarget[];
}

/**
 * Hosts the status route is allowed to contact. Anything else is rejected at
 * module load, so a mistyped or hostile URL can never reach production.
 */
export const ALLOWED_PROBE_HOSTS: ReadonlySet<string> = new Set([
  'voice.foxestechnology.com',
  'search.foxestechnology.com',
  'foxes-api-production.up.railway.app',
  'egypt-excursionsonline.com',
  'www.egypt-excursionsonline.com',
]);

export const PROBE_TIMEOUT_MS = 3_000;
export const STATUS_CACHE_TTL_MS = 60_000;

export class ProbeUrlNotAllowedError extends Error {
  constructor(url: string) {
    super(`Probe URL is not on the first-party allowlist: ${url}`);
    this.name = 'ProbeUrlNotAllowedError';
  }
}

/**
 * Accepts only absolute https URLs on an allowlisted host, with no
 * credentials, query string or fragment. Returns the normalized URL string.
 */
export function assertAllowlistedProbeUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ProbeUrlNotAllowedError(url);
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !ALLOWED_PROBE_HOSTS.has(parsed.hostname)
  ) {
    throw new ProbeUrlNotAllowedError(url);
  }
  return parsed.toString();
}

function probe(id: string, url: string, contract: ProbeContract): ProbeTarget {
  return { id, url: assertAllowlistedProbeUrl(url), contract };
}

/**
 * The storefront's own build discriminator. Probed through the public site
 * URL so the answer reflects what a visitor reaches, not the process that
 * happens to be serving the status route.
 */
function storefrontVersionUrl(): string {
  try {
    const base = new URL(SEO_BASE_URL);
    if (base.protocol === 'https:' && ALLOWED_PROBE_HOSTS.has(base.hostname)) {
      return `${base.origin}/api/version`;
    }
  } catch {
    // fall through to the canonical public host
  }
  return 'https://egypt-excursionsonline.com/api/version';
}

export const SHOWCASE_CAPABILITIES: readonly ShowcaseCapability[] = [
  {
    id: 'ai-voice',
    // Preview until the EEO voice tenant is active on the voice platform again
    // (its trial has lapsed): the service health probe alone would read "Live"
    // while /ai-voice cannot reach a call.
    tier: 'preview',
    copyKey: 'ai-voice',
    href: '/ai-voice',
    probes: [],
  },
  {
    id: 'ai-search',
    tier: 'accepted',
    copyKey: 'ai-search',
    href: '/tours',
    probes: [probe('search-service', 'https://search.foxestechnology.com/api/version', { kind: 'json-object' })],
  },
  {
    id: 'online-booking',
    tier: 'accepted',
    copyKey: 'online-booking',
    href: '/tours',
    // Checkout runs on this storefront; the booking platform behind the guided
    // booking assistant is probed as well so "Live" only appears when every
    // booking dependency on the allowlist answers.
    probes: [
      // EEO checkout runs inside this storefront; the separate booking platform
      // is not on its path, so only the storefront itself decides "Live".
      probe('storefront', storefrontVersionUrl(), { kind: 'json-object' }),
    ],
  },
  {
    // The apps are announced on /mobile-app but not yet in the stores, so the
    // card is a preview: no probe, no call to action, never "Live".
    id: 'mobile-apps',
    tier: 'preview',
    copyKey: 'mobile-apps',
    href: null,
    probes: [],
  },
];

const ids = SHOWCASE_CAPABILITIES.map((capability) => capability.id);
if (new Set(ids).size !== ids.length) {
  throw new Error('Showcase capability ids must be unique.');
}

export function showcaseCapabilityById(id: string): ShowcaseCapability | undefined {
  return SHOWCASE_CAPABILITIES.find((capability) => capability.id === id);
}
