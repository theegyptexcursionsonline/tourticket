import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import { consumeAbuseLimit } from '@/lib/security/distributedAbuseLimit';
import {
  BOOKING_SUPPORT_ACTION_KINDS,
  confirmBookingSupportRequest,
  proposeBookingSupportRequest,
  withdrawBookingSupportRequest,
  authenticateSupportMcp,
  getBookingSupportSummary,
  getPickupSupportStatus,
  revokeSupportIdentity,
  type SupportMcpConfig,
  verifySupportBookingIdentity,
} from '@/lib/supportMcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SERVER_INFO = { name: 'eeo-booking-support', version: '1.0.0' };
const TOOL_NAMES = [
  'verify_booking_identity',
  'get_booking_support_summary',
  'get_pickup_support_status',
  'revoke_booking_identity',
  'propose_booking_support_request',
  'confirm_booking_support_request',
  'withdraw_booking_support_request',
] as const;

// Ops-request tools write a REQUEST row, never a booking. Idempotent per key.
const REQUEST_WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const SECURITY_STATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const bindingSchema = z
  .object({
    workspaceKey: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,79}$/),
    conversationId: z.string().trim().regex(/^[a-f0-9]{24}$/i),
    channel: z.enum(['widget', 'whatsapp']),
  })
  .strict();

function toolResult(payload: Record<string, unknown>, isError = false): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    ...(isError ? { isError: true } : { structuredContent: payload }),
  };
}

function rpcError(code: number, message: string) {
  return { jsonrpc: '2.0', id: null, error: { code, message } };
}

function createServer(config: SupportMcpConfig): McpServer {
  const server = new McpServer(SERVER_INFO);

  server.registerTool(
    'verify_booking_identity',
    {
      title: 'Verify booking identity',
      description:
        'Deterministically compare a provider-verified phone or previously OTP-verified email to one EEO booking. This tool is for trusted server policy code only, never model-selected.',
      inputSchema: z
        .object({
          reference: z.string().trim().min(12).max(80),
          proofType: z.enum(['provider_phone', 'verified_email']),
          proofValue: z.string().trim().min(3).max(254),
          verificationId: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,159}$/),
          binding: bindingSchema,
        })
        .strict(),
      annotations: SECURITY_STATE_ANNOTATIONS,
    },
    async ({ reference, proofType, proofValue, verificationId, binding }) => {
      const result = await verifySupportBookingIdentity(
        { reference, proofType, proofValue, verificationId, binding },
        config,
      );
      // A non-match is an expected, enumeration-safe policy result, not an MCP
      // transport/tool failure. The trusted client maps it to identity handover.
      return toolResult(result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    'get_booking_support_summary',
    {
      title: 'Get booking support summary',
      description:
        'Return only support-safe booking status, tour, option and service date/time for a valid conversation-bound identity handle.',
      inputSchema: z
        .object({
          handle: z.string().trim().regex(/^eih_[A-Za-z0-9_-]{43}$/),
          binding: bindingSchema,
        })
        .strict(),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ handle, binding }) => {
      const summary = await getBookingSupportSummary({ handle, binding }, config);
      return summary
        ? toolResult(summary as unknown as Record<string, unknown>)
        : toolResult({ code: 'IDENTITY_REQUIRED', message: 'Booking identity is unavailable.' }, true);
    },
  );

  server.registerTool(
    'get_pickup_support_status',
    {
      title: 'Get pickup support status',
      description:
        'Return a support-safe pickup location label when TourTicket owns one. It never exposes coordinates, addresses, internal notes or inferred driver data.',
      inputSchema: z
        .object({
          handle: z.string().trim().regex(/^eih_[A-Za-z0-9_-]{43}$/),
          binding: bindingSchema,
        })
        .strict(),
      annotations: READ_ONLY_ANNOTATIONS,
    },
    async ({ handle, binding }) => {
      const pickup = await getPickupSupportStatus({ handle, binding }, config);
      return pickup
        ? toolResult(pickup as unknown as Record<string, unknown>)
        : toolResult({ code: 'IDENTITY_REQUIRED', message: 'Booking identity is unavailable.' }, true);
    },
  );

  server.registerTool(
    'revoke_booking_identity',
    {
      title: 'Revoke booking identity',
      description:
        'Invalidate a short-lived booking identity handle when the conversation hands over, closes or resets. It never changes booking data.',
      inputSchema: z
        .object({
          handle: z.string().trim().regex(/^eih_[A-Za-z0-9_-]{43}$/),
          binding: bindingSchema,
        })
        .strict(),
      annotations: SECURITY_STATE_ANNOTATIONS,
    },
    async ({ handle, binding }) => {
      const result = await revokeSupportIdentity({ handle, binding }, config);
      return toolResult(result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    'propose_booking_support_request',
    {
      title: 'Propose booking support request',
      description:
        'Register a verified customer\'s request (pickup change, booking change, cancellation, callback, voucher resend) as PROPOSED for the operations team. It never changes a booking; the request stays invisible to operations until FoxesConnect confirms it after a person approved.',
      inputSchema: z
        .object({
          handle: z.string().trim().regex(/^eih_[A-Za-z0-9_-]{43}$/),
          actionKind: z.enum(BOOKING_SUPPORT_ACTION_KINDS),
          customerRequest: z.string().trim().min(1).max(600),
          language: z.string().trim().min(2).max(8),
          idempotencyKey: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,179}$/),
          binding: bindingSchema,
        })
        .strict(),
      annotations: REQUEST_WRITE_ANNOTATIONS,
    },
    async (input) => {
      const result = await proposeBookingSupportRequest(input, config);
      return 'code' in result ? toolResult(result, true) : toolResult(result);
    },
  );

  server.registerTool(
    'confirm_booking_support_request',
    {
      title: 'Confirm booking support request',
      description: 'A FoxesConnect teammate approved a PROPOSED request: make it visible and actionable for operations. Idempotent; never changes a booking.',
      inputSchema: z
        .object({
          requestId: z.string().trim().regex(/^bsr_[a-f0-9]{24}$/),
          idempotencyKey: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{7,179}$/),
          approvedBy: z.string().trim().min(1).max(120),
          binding: bindingSchema,
        })
        .strict(),
      annotations: REQUEST_WRITE_ANNOTATIONS,
    },
    async (input) => {
      const result = await confirmBookingSupportRequest(input, config);
      return 'code' in result ? toolResult(result, true) : toolResult(result);
    },
  );

  server.registerTool(
    'withdraw_booking_support_request',
    {
      title: 'Withdraw booking support request',
      description: 'FoxesConnect rejected or expired a request: withdraw it so operations never act on it. Idempotent.',
      inputSchema: z
        .object({
          requestId: z.string().trim().regex(/^bsr_[a-f0-9]{24}$/),
          reason: z.string().trim().min(1).max(200),
          binding: bindingSchema,
        })
        .strict(),
      annotations: REQUEST_WRITE_ANNOTATIONS,
    },
    async (input) => {
      const result = await withdrawBookingSupportRequest(input, config);
      return 'code' in result ? toolResult(result, true) : toolResult(result);
    },
  );

  return server;
}

function authFailure(status: 401 | 503) {
  return NextResponse.json(
    rpcError(status === 503 ? -32003 : -32001, status === 503 ? 'Support connector unavailable' : 'Authentication required'),
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function enforceServiceRate(config: SupportMcpConfig): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  await dbConnect();
  return consumeAbuseLimit({
    scope: 'support-mcp:service',
    identity: createHash('sha256').update(config.apiToken).digest('hex'),
    limit: 180,
    windowMs: 60_000,
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateSupportMcp(request);
  if (!auth.ok) return authFailure(auth.status);
  const rate = await enforceServiceRate(auth.config);
  if (!rate.allowed) {
    return NextResponse.json(rpcError(-32002, 'Rate limit exceeded'), {
      status: 429,
      headers: {
        'Cache-Control': 'private, no-store',
        'Retry-After': String(rate.retryAfterSeconds),
      },
    });
  }

  const server = createServer(auth.config);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    // The SDK has already completed the stateless JSON response. Returning that
    // object directly preserves its body stream; re-wrapping it and immediately
    // closing the transport can yield an empty response in some runtimes.
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    return NextResponse.json(rpcError(-32603, 'Internal error'), {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function GET(request: NextRequest) {
  const auth = authenticateSupportMcp(request);
  if (!auth.ok) return authFailure(auth.status);
  return NextResponse.json(
    {
      server: SERVER_INFO,
      protocol: 'Model Context Protocol - Streamable HTTP',
      mode: 'stateless-json',
      workspaceKey: auth.config.workspaceKey,
      tenantId: auth.config.tenantId,
      tools: TOOL_NAMES,
      bookingData: 'read-only; ops requests via FoxesConnect approval (never booking mutations)',
      driverToolAvailable: false,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
