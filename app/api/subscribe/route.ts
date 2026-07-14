import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import {
  NEWSLETTER_SOURCES,
  type NewsletterSource,
} from '@/lib/models/NewsletterConsent';
import {
  requestNewsletterSubscription,
  unsubscribeNewsletter,
} from '@/lib/newsletter/subscriptionService';
import {
  enforcePublicActionLimits,
  hashPrivacyKey,
  publicRequestIdentity,
} from '@/lib/security/distributedAbuseLimit';
import {
  normalizeEmail,
  PublicInputError,
  readBoundedJson,
} from '@/lib/security/publicInput';

export const dynamic = 'force-dynamic';

const PUBLIC_TENANT_ID = 'default';
const ONE_HOUR = 60 * 60 * 1_000;

interface SubscriptionBody {
  email?: unknown;
  source?: unknown;
  consent?: unknown;
}

function parseSource(value: unknown): NewsletterSource {
  const source = typeof value === 'string' ? value.trim().toLowerCase() : 'footer';
  if (!NEWSLETTER_SOURCES.includes(source as NewsletterSource)) {
    throw new PublicInputError('Unsupported subscription source.');
  }
  return source as NewsletterSource;
}

function auditMetadata(request: Request, email: string, source: NewsletterSource) {
  const requestIdentity = publicRequestIdentity(request);
  return {
    requestHash: hashPrivacyKey(
      `${requestIdentity}|${PUBLIC_TENANT_ID}|${source}|${email}`,
      'newsletter-request-audit',
    ),
    agentHash: hashPrivacyKey(
      (request.headers.get('user-agent') || 'unavailable').slice(0, 256),
      'newsletter-agent-audit',
    ),
  };
}

function errorResponse(error: unknown) {
  if (error instanceof PublicInputError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  console.error('Newsletter request failed:', error instanceof Error ? error.message : 'unknown_error');
  return NextResponse.json(
    {
      success: false,
      error: 'Newsletter requests are temporarily unavailable. Please try again later.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<SubscriptionBody>(request, 4_096);
    const normalizedEmail = normalizeEmail(body.email);
    if (!normalizedEmail) throw new PublicInputError('Please enter a valid email address.');
    if (body.consent !== true) {
      throw new PublicInputError('Please agree to receive newsletter emails before continuing.');
    }
    const source = parseSource(body.source);

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'newsletter-subscribe',
      subject: `${PUBLIC_TENANT_ID}:${source}:${normalizedEmail}`,
      networkLimit: 20,
      subjectLimit: 5,
      windowMs: ONE_HOUR,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many newsletter requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rate.retryAfterSeconds),
          },
        },
      );
    }

    const result = await requestNewsletterSubscription({
      tenantId: PUBLIC_TENANT_ID,
      source,
      normalizedEmail,
      audit: auditMetadata(request, normalizedEmail, source),
    });

    if (result.status === 'confirmed') {
      return NextResponse.json(
        {
          success: true,
          status: result.status,
          providerState: result.providerState,
          replayed: true,
          message: 'This email is already confirmed for the newsletter.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (!result.deliveryReady) {
      return NextResponse.json(
        {
          success: false,
          saved: true,
          status: 'pending',
          providerState: result.providerState,
          replayed: result.replayed,
          error: 'Your request was saved, but confirmation delivery is unavailable. You are not subscribed yet.',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: 'pending',
        providerState: result.providerState,
        replayed: result.replayed,
        message: 'Check your inbox and confirm your email to finish subscribing.',
      },
      { status: 202, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await readBoundedJson<SubscriptionBody>(request, 4_096);
    const normalizedEmail = normalizeEmail(body.email);
    if (!normalizedEmail) throw new PublicInputError('Please enter a valid email address.');
    const source = parseSource(body.source);

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'newsletter-unsubscribe',
      subject: `${PUBLIC_TENANT_ID}:${source}:${normalizedEmail}`,
      networkLimit: 30,
      subjectLimit: 10,
      windowMs: ONE_HOUR,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many newsletter requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rate.retryAfterSeconds),
          },
        },
      );
    }

    const result = await unsubscribeNewsletter({
      tenantId: PUBLIC_TENANT_ID,
      source,
      normalizedEmail,
      audit: auditMetadata(request, normalizedEmail, source),
    });
    return NextResponse.json(
      {
        success: true,
        status: result.status,
        providerState: result.providerState,
        replayed: result.replayed,
        message: 'This email is unsubscribed from this newsletter source.',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
