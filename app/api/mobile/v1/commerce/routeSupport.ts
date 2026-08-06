import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { InventoryHoldError } from '@/lib/checkout/inventoryHolds';
import { MOBILE_COMMERCE_CONTRACT, MobileCommerceError } from '@/lib/checkout/mobileCommerce';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';
import { PublicInputError, readBoundedJson } from '@/lib/security/publicInput';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-EEO-Commerce-Contract': MOBILE_COMMERCE_CONTRACT,
};

type MobileRouteOptions = {
  action: string;
  networkLimit: number;
  subjectLimit?: number;
  successStatus?: number;
  authorize?: (request: Request) => void;
  operation: (body: unknown) => Promise<unknown>;
};

export function requireMobileCommerceService(request: Request) {
  const expected = process.env.MOBILE_COMMERCE_SERVICE_TOKEN?.trim() || '';
  if (expected.length < 32) {
    throw new MobileCommerceError(503, 'SERVICE_AUTH_UNAVAILABLE', 'The mobile commerce service bridge is not configured.');
  }
  const header = request.headers.get('authorization') || '';
  const presented = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const expectedBuffer = Buffer.from(expected);
  const presentedBuffer = Buffer.from(presented);
  if (presentedBuffer.length !== expectedBuffer.length
    || !timingSafeEqual(presentedBuffer, expectedBuffer)) {
    throw new MobileCommerceError(401, 'SERVICE_AUTH_REQUIRED', 'Valid mobile commerce service authorization is required.');
  }
}

export async function handleMobileCommerceRoute(request: Request, options: MobileRouteOptions) {
  try {
    options.authorize?.(request);
    const body = await readBoundedJson<Record<string, unknown>>(request, 32 * 1_024);
    await dbConnect();
    const subject = typeof body.tourId === 'string' ? body.tourId.slice(0, 128) : undefined;
    const rate = await enforcePublicActionLimits({
      request,
      action: options.action,
      subject,
      networkLimit: options.networkLimit,
      subjectLimit: options.subjectLimit,
      windowMs: 15 * 60 * 1_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many commerce requests. Try again later.' } },
        {
          status: 429,
          headers: { ...PRIVATE_HEADERS, 'Retry-After': String(rate.retryAfterSeconds) },
        },
      );
    }
    const data = await options.operation(body);
    return NextResponse.json(
      { success: true, data },
      { status: options.successStatus || 200, headers: PRIVATE_HEADERS },
    );
  } catch (error: unknown) {
    if (error instanceof MobileCommerceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        },
        { status: error.status, headers: PRIVATE_HEADERS },
      );
    }
    if (error instanceof InventoryHoldError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status, headers: PRIVATE_HEADERS },
      );
    }
    if (error instanceof PublicInputError) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST_BODY', message: error.message } },
        { status: error.status, headers: PRIVATE_HEADERS },
      );
    }
    console.error(`[mobile-commerce] ${options.action} failed`, error instanceof Error ? error.message : 'Unknown failure');
    return NextResponse.json(
      { success: false, error: { code: 'COMMERCE_UNAVAILABLE', message: 'Commerce is temporarily unavailable.' } },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}
