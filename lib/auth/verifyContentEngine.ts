// lib/auth/verifyContentEngine.ts
// Bearer-token auth for the foxes-content-engine adapter routes.
// The engine pushes published drafts via POST /api/admin/content/:type
// using a Bearer API key stored in CONTENT_ENGINE_API_KEY.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { registerAdminAuditActor } from "@/lib/admin/adminAudit";

const DEFAULT_CONTENT_TENANT = "default";
const CONTENT_TENANT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

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
  const expected = process.env.CONTENT_ENGINE_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Content engine adapter is not configured (missing CONTENT_ENGINE_API_KEY)" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const presented = Buffer.from(header.slice(7).trim());
  const expectedBytes = Buffer.from(expected);
  if (presented.length !== expectedBytes.length) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!timingSafeEqual(presented, expectedBytes)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null;
}
