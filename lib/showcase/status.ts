/**
 * Runtime health for the technology showcase.
 *
 * Probes every registry target in parallel with a hard per-probe timeout,
 * maps each capability to `live` or `unavailable`, and caches the whole
 * observation for one minute. Nothing here can ever manufacture a "live":
 * a timeout, transport failure, non-200, malformed body, or a body that
 * misses its contract is `unavailable`, and a `preview` capability stays
 * `unavailable` in this route even when its dependencies are healthy — the
 * page renders it as "Preview" from the tier, not from health.
 */
import {
  PROBE_TIMEOUT_MS,
  SHOWCASE_CAPABILITIES,
  STATUS_CACHE_TTL_MS,
  type CapabilityId,
  type CapabilityTier,
  type ProbeContract,
  type ProbeTarget,
} from './registry';

export type CapabilityStatus = 'live' | 'unavailable';

export interface CapabilityObservation {
  id: CapabilityId;
  tier: CapabilityTier;
  status: CapabilityStatus;
  checkedAt: string;
}

export interface TechnologyStatusPayload {
  capabilities: CapabilityObservation[];
  checkedAt: string;
  expiresAt: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface EvaluateOptions {
  fetchImpl?: FetchLike;
  now?: () => number;
  timeoutMs?: number;
}

function bodySatisfies(contract: ProbeContract, body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (contract.kind === 'status-ok') {
    return (body as { status?: unknown }).status === 'ok';
  }
  return true;
}

/** One probe → healthy or not. Never throws. */
export async function probeTarget(
  target: ProbeTarget,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(target.url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.status !== 200) return false;
    const body: unknown = await response.json();
    return bodySatisfies(target.contract, body);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Probe everything in parallel and build the payload. Uncached. */
export async function evaluateTechnologyStatus(options: EvaluateOptions = {}): Promise<TechnologyStatusPayload> {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? PROBE_TIMEOUT_MS;

  const targets = new Map<string, ProbeTarget>();
  for (const capability of SHOWCASE_CAPABILITIES) {
    for (const target of capability.probes) targets.set(target.url, target);
  }

  const results = new Map<string, boolean>();
  await Promise.all(
    [...targets.values()].map(async (target) => {
      results.set(target.url, await probeTarget(target, fetchImpl, timeoutMs));
    }),
  );

  const checkedAtMs = now();
  const checkedAt = new Date(checkedAtMs).toISOString();
  const capabilities: CapabilityObservation[] = SHOWCASE_CAPABILITIES.map((capability) => {
    const healthy =
      capability.tier === 'accepted' &&
      capability.probes.length > 0 &&
      capability.probes.every((target) => results.get(target.url) === true);
    return { id: capability.id, tier: capability.tier, status: healthy ? 'live' : 'unavailable', checkedAt };
  });

  return {
    capabilities,
    checkedAt,
    expiresAt: new Date(checkedAtMs + STATUS_CACHE_TTL_MS).toISOString(),
  };
}

let cached: { payload: TechnologyStatusPayload; expiresAtMs: number } | null = null;
let inFlight: Promise<TechnologyStatusPayload> | null = null;

/**
 * Cached for `STATUS_CACHE_TTL_MS`; concurrent callers share one evaluation.
 * An expired entry is never served — the next caller re-probes.
 */
export async function getTechnologyStatus(options: EvaluateOptions = {}): Promise<TechnologyStatusPayload> {
  const now = options.now ?? Date.now;
  if (cached && cached.expiresAtMs > now()) return cached.payload;
  if (inFlight) return inFlight;

  inFlight = evaluateTechnologyStatus(options)
    .then((payload) => {
      cached = { payload, expiresAtMs: Date.parse(payload.expiresAt) };
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Test hook. */
export function resetTechnologyStatusCache(): void {
  cached = null;
  inFlight = null;
}
