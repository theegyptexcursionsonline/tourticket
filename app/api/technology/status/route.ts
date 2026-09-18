import { NextResponse } from 'next/server';
import { getTechnologyStatus } from '@/lib/showcase/status';

// Public, read-only. Probes a fixed first-party allowlist (see
// lib/showcase/registry.ts) — never a request-supplied URL — and answers with
// per-capability live/unavailable plus the observation's expiry. The
// observation is cached in-process for a minute (getTechnologyStatus); an
// expired one is never re-served. No CDN caching header is set here: the
// site's next.config.ts applies `no-store` to every /api route and would
// override it, so the client re-fetches and the in-process cache absorbs it.
export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await getTechnologyStatus();
  return NextResponse.json(payload, { status: 200 });
}
