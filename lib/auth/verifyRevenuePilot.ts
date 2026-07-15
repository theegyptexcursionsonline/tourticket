import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RevenueMachineNonce from '@/lib/models/RevenueMachineNonce';
import { configuredRevenuePilotMachineKeys, revenuePilotMachineScopes } from '@/lib/auth/revenuePilotMachineConfig';

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function revenueBodyHash(bodyText = '') {
  return createHash('sha256').update(bodyText).digest('hex');
}

export function revenueCanonicalRequest(request: NextRequest, timestamp: string, nonce: string, bodyText = '') {
  return [timestamp, nonce, request.method.toUpperCase(), `${request.nextUrl.pathname}${request.nextUrl.search}`, revenueBodyHash(bodyText)].join('\n');
}

export function validateRevenuePilotSignature(request: NextRequest, bodyText = '', requiredScope: 'read' | 'write' = 'read'): { ok: true; keyId: string } | { ok: false; status: number; code: string } {
  const keyId = request.headers.get('x-rp-key-id')?.trim() || '';
  const timestamp = request.headers.get('x-rp-timestamp')?.trim() || '';
  const nonce = request.headers.get('x-rp-nonce')?.trim() || '';
  const presented = request.headers.get('x-rp-signature')?.trim() || '';
  const secret = configuredRevenuePilotMachineKeys().get(keyId);
  const timestampMs = Number(timestamp);

  if (!secret || !nonce || nonce.length > 120 || !Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, status: 401, code: 'MACHINE_UNAUTHORIZED' };
  }
  if (!revenuePilotMachineScopes(keyId).has(requiredScope)) {
    return { ok: false, status: 403, code: 'MACHINE_SCOPE_FORBIDDEN' };
  }
  const expected = createHmac('sha256', secret).update(revenueCanonicalRequest(request, timestamp, nonce, bodyText)).digest('hex');
  if (presented.length !== expected.length || !timingSafeEqual(Buffer.from(presented), Buffer.from(expected))) {
    return { ok: false, status: 401, code: 'MACHINE_UNAUTHORIZED' };
  }
  return { ok: true, keyId };
}

export async function claimRevenueNonce(keyId: string, nonce: string) {
  await dbConnect();
  try {
    await RevenueMachineNonce.create({ keyId, nonce, expiresAt: new Date(Date.now() + MAX_CLOCK_SKEW_MS) });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
  return true;
}

export async function verifyRevenuePilot(request: NextRequest, bodyText = '', requiredScope: 'read' | 'write' = 'read'): Promise<{ keyId: string } | NextResponse> {
  const validation = validateRevenuePilotSignature(request, bodyText, requiredScope);
  if (!validation.ok) {
    const message = validation.code === 'MACHINE_SCOPE_FORBIDDEN' ? 'This machine identity does not have the required scope.' : 'Valid machine authentication is required.';
    return NextResponse.json({ error: { code: validation.code, message } }, { status: validation.status });
  }
  const nonce = request.headers.get('x-rp-nonce')!.trim();
  if (!await claimRevenueNonce(validation.keyId, nonce)) return NextResponse.json({ error: { code: 'MACHINE_REPLAY', message: 'This signed request was already used.' } }, { status: 409 });
  return { keyId: validation.keyId };
}
