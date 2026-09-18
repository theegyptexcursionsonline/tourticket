import { NextResponse } from 'next/server';
import { getTechnologyStatus } from '@/lib/showcase/status';

// Public, read-only. Probes a fixed first-party allowlist (see
// lib/showcase/registry.ts) — never a request-supplied URL — and answers with
// per-capability live/unavailable plus the observation's expiry. Cached for a
// minute in-process and at the CDN; an expired observation is never re-served.
export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await getTechnologyStatus();
  return NextResponse.json(payload, {
    status: 200,
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' },
  });
}
