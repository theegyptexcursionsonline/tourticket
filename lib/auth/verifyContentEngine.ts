// lib/auth/verifyContentEngine.ts
// Bearer-token auth for the foxes-content-engine adapter routes.
// The engine pushes published drafts via POST /api/admin/content/:type
// using a Bearer API key stored in CONTENT_ENGINE_API_KEY.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { registerAdminAuditActor } from "@/lib/admin/adminAudit";

const DEFAULT_CONTENT_TENANT = "default";
const CONTENT_TENANT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const RECEIVER_GRANTS_ENV = "CONTENT_ENGINE_RECEIVER_GRANTS_JSON";
const SECRET_ENV_PATTERN = /^CONTENT_ENGINE_API_KEY(?:_[A-Z0-9]+)*$/;
const GRANT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MUTATION_RECEIVER_TYPES = ["blog", "destination", "category"] as const;

export const CONTENT_ENGINE_MUTATION_HEADERS = {
  receiverType: "X-Content-Engine-Receiver-Type",
  tenant: "X-Content-Engine-Tenant",
  locale: "X-Content-Engine-Locale",
} as const;

export type ContentEngineMutationReceiverType = typeof MUTATION_RECEIVER_TYPES[number];

type ReceiverGrantTarget = {
  receiverType: ContentEngineMutationReceiverType;
  tenantId: typeof DEFAULT_CONTENT_TENANT;
  locale: "en";
};

export type VerifiedContentEngineMutationCredential = {
  grantId: string;
  targets: readonly ReceiverGrantTarget[];
};

export type ContentEngineMutationAuthentication =
  | { ok: true; credential: VerifiedContentEngineMutationCredential }
  | { ok: false; response: NextResponse };

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseReceiverGrants():
  | { ok: true; grants: Array<VerifiedContentEngineMutationCredential & { secret: string }> }
  | { ok: false } {
  const raw = process.env[RECEIVER_GRANTS_ENV];
  if (!raw?.trim() || raw.length > 16_384) return { ok: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, ["version", "grants"])) return { ok: false };
  if (parsed.version !== 1 || !Array.isArray(parsed.grants) || parsed.grants.length < 1 || parsed.grants.length > 8) {
    return { ok: false };
  }

  const ids = new Set<string>();
  const secretEnvs = new Set<string>();
  const resolvedSecrets = new Set<string>();
  const grants: Array<VerifiedContentEngineMutationCredential & { secret: string }> = [];

  for (const candidate of parsed.grants) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ["id", "secretEnv", "targets"])) return { ok: false };
    const { id, secretEnv, targets } = candidate;
    if (
      typeof id !== "string" || !GRANT_ID_PATTERN.test(id) || ids.has(id)
      || typeof secretEnv !== "string" || !SECRET_ENV_PATTERN.test(secretEnv) || secretEnvs.has(secretEnv)
      || !Array.isArray(targets) || targets.length < 1 || targets.length > MUTATION_RECEIVER_TYPES.length
    ) {
      return { ok: false };
    }

    const secret = process.env[secretEnv];
    if (!secret || secret !== secret.trim() || resolvedSecrets.has(secret)) return { ok: false };

    const normalizedTargets: ReceiverGrantTarget[] = [];
    const targetKeys = new Set<string>();
    for (const target of targets) {
      if (!isRecord(target) || !hasExactKeys(target, ["receiverType", "tenantId", "locale"])) return { ok: false };
      if (
        typeof target.receiverType !== "string"
        || !MUTATION_RECEIVER_TYPES.includes(target.receiverType as ContentEngineMutationReceiverType)
        || target.tenantId !== DEFAULT_CONTENT_TENANT
        || target.locale !== "en"
      ) {
        return { ok: false };
      }
      const normalized = target as ReceiverGrantTarget;
      const targetKey = `${normalized.receiverType}\u0000${normalized.tenantId}\u0000${normalized.locale}`;
      if (targetKeys.has(targetKey)) return { ok: false };
      targetKeys.add(targetKey);
      normalizedTargets.push(normalized);
    }

    ids.add(id);
    secretEnvs.add(secretEnv);
    resolvedSecrets.add(secret);
    grants.push({ grantId: id, secret, targets: normalizedTargets });
  }

  return { ok: true, grants };
}

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function tokensEqual(presented: string, expected: string): boolean {
  const presentedBytes = Buffer.from(presented);
  const expectedBytes = Buffer.from(expected);
  return presentedBytes.length === expectedBytes.length && timingSafeEqual(presentedBytes, expectedBytes);
}

function matchingGrant(
  presented: string,
  grants: Array<VerifiedContentEngineMutationCredential & { secret: string }>,
): (typeof grants)[number] | undefined {
  let match: (typeof grants)[number] | undefined;
  for (const candidate of grants) {
    if (tokensEqual(presented, candidate.secret)) match = candidate;
  }
  return match;
}

/** Authenticate a mutation against the strict, rotation-capable receiver grant registry. */
export function authenticateContentEngineMutation(
  req: NextRequest,
): ContentEngineMutationAuthentication {
  const configured = parseReceiverGrants();
  if (!configured.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Content engine receiver grants are missing or misconfigured" },
        { status: 503 },
      ),
    };
  }

  const presented = bearerToken(req);
  if (!presented) {
    return { ok: false, response: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }

  const grant = matchingGrant(presented, configured.grants);
  if (!grant) {
    return { ok: false, response: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }

  return { ok: true, credential: { grantId: grant.grantId, targets: grant.targets } };
}

/**
 * Bind an authenticated mutation to the exact route, body and required header tuple.
 * This must run before database connection, idempotency claim or content write.
 */
export function verifyContentEngineMutationTarget(
  req: NextRequest,
  credential: VerifiedContentEngineMutationCredential,
  bodyTarget: { receiverType: ContentEngineMutationReceiverType; tenantId: unknown; locale: unknown },
): NextResponse | null {
  const headerTarget = {
    receiverType: req.headers.get(CONTENT_ENGINE_MUTATION_HEADERS.receiverType),
    tenantId: req.headers.get(CONTENT_ENGINE_MUTATION_HEADERS.tenant),
    locale: req.headers.get(CONTENT_ENGINE_MUTATION_HEADERS.locale),
  };

  if (!headerTarget.receiverType || !headerTarget.tenantId || !headerTarget.locale) {
    return NextResponse.json({ error: "Content engine receiver target headers are required" }, { status: 422 });
  }
  if (
    headerTarget.receiverType !== bodyTarget.receiverType
    || headerTarget.tenantId !== bodyTarget.tenantId
    || headerTarget.locale !== bodyTarget.locale
  ) {
    return NextResponse.json({ error: "Content engine receiver target does not match the request" }, { status: 422 });
  }

  const allowed = credential.targets.some((target) => (
    target.receiverType === bodyTarget.receiverType
    && target.tenantId === bodyTarget.tenantId
    && target.locale === bodyTarget.locale
  ));
  if (!allowed) {
    return NextResponse.json({ error: "Content engine credential is not granted for this receiver target" }, { status: 403 });
  }

  return null;
}

export type VerifiedContentEngineTenant =
  | { ok: true; tenantId: string }
  | { ok: false; response: NextResponse };

function configuredContentTenants():
  | { ok: true; tenantIds: Set<string> }
  | { ok: false } {
  const raw = process.env.CONTENT_ENGINE_ALLOWED_TENANTS;
  if (!raw?.trim()) {
    return { ok: false };
  }

  const values = raw.split(",").map((value) => value.trim());
  if (
    values.length !== 1
    || values.some((value) => !CONTENT_TENANT_PATTERN.test(value))
    || values[0] !== DEFAULT_CONTENT_TENANT
  ) {
    return { ok: false };
  }

  return { ok: true, tenantIds: new Set(values) };
}

/**
 * Resolve and authorize a receiver tenant before any database access.
 *
 * This repository is the flagship storefront receiver. Every request must name
 * the exact `default` tenant and writes remain disabled until the exact
 * allowlist `default` is configured. Network tenants publish through their own
 * storefront receivers; accepting one here would produce a flagship live URL
 * and expose it through resolvers that intentionally serve default content.
 */
export function verifyContentEngineTenant(
  input: unknown,
): VerifiedContentEngineTenant {
  if (typeof input !== "string" || !input.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid tenantId" }, { status: 422 }),
    };
  }

  const tenantId = input.trim();
  if (!CONTENT_TENANT_PATTERN.test(tenantId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid tenantId" }, { status: 422 }),
    };
  }

  const configured = configuredContentTenants();
  if (!configured.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Content engine tenant allowlist is missing or misconfigured" },
        { status: 503 },
      ),
    };
  }
  if (!configured.tenantIds.has(tenantId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Content tenant is not enabled" }, { status: 422 }),
    };
  }

  registerAdminAuditActor({
    userId: "content-engine",
    name: "Content Engine",
    role: "system",
    permissions: [],
    tenantIds: [tenantId],
  }, { fallbackTenantIds: [tenantId] });

  return { ok: true, tenantId };
}

export function verifyContentEngine(req: NextRequest): NextResponse | null {
  const presentedToken = bearerToken(req);
  if (!presentedToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  if (process.env[RECEIVER_GRANTS_ENV]?.trim()) {
    const configured = parseReceiverGrants();
    if (!configured.ok) {
      return NextResponse.json(
        { error: "Content engine receiver grants are missing or misconfigured" },
        { status: 503 },
      );
    }
    if (!matchingGrant(presentedToken, configured.grants)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return null;
  }

  const expected = process.env.CONTENT_ENGINE_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Content engine adapter is not configured (missing CONTENT_ENGINE_API_KEY)" },
      { status: 503 },
    );
  }

  if (!tokensEqual(presentedToken, expected)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null;
}
