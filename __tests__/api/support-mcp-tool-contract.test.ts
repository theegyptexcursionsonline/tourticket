import {
  ReadableStream as NodeReadableStream,
  TransformStream as NodeTransformStream,
  WritableStream as NodeWritableStream,
} from 'node:stream/web';
import recordedInputSchemas from './fixtures/support-mcp-input-schemas.json';

// FoxesConnect's side of the EEO support MCP connector: the tool input schemas
// it is offered and how arguments are validated before any booking code runs.
// The fixture was recorded on zod 3.25.76, before the move to zod 4 for
// GHSA-mrhx-c7xc-m3w5, so a validator upgrade cannot quietly change the contract.

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/SupportIdentityHandle', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/BookingSupportRequest', () => ({ __esModule: true, default: {}, BOOKING_SUPPORT_ACTION_KINDS: ['request_pickup_change', 'request_booking_change', 'request_cancellation', 'request_human_callback', 'resend_voucher'], BOOKING_SUPPORT_REQUEST_STATUSES: ['proposed', 'received', 'withdrawn', 'in_progress', 'resolved'] }));
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  consumeAbuseLimit: jest.fn().mockResolvedValue({
    allowed: true,
    count: 1,
    limit: 180,
    retryAfterSeconds: 60,
  }),
}));

// Keep the real authentication and action kinds; record what each booking
// handler receives instead of touching booking data.
const mockHandlerCalls: Array<{ handler: string; input: unknown }> = [];
jest.mock('@/lib/supportMcp', () => {
  const actual = jest.requireActual('@/lib/supportMcp');
  const recording = (handler: string) => async (input: unknown) => {
    mockHandlerCalls.push({ handler, input });
    return { recorded: true };
  };
  return {
    ...actual,
    verifySupportBookingIdentity: recording('verifySupportBookingIdentity'),
    getBookingSupportSummary: recording('getBookingSupportSummary'),
    getPickupSupportStatus: recording('getPickupSupportStatus'),
    revokeSupportIdentity: recording('revokeSupportIdentity'),
    proposeBookingSupportRequest: recording('proposeBookingSupportRequest'),
    confirmBookingSupportRequest: recording('confirmBookingSupportRequest'),
    withdrawBookingSupportRequest: recording('withdrawBookingSupportRequest'),
  };
});

const originalWebGlobals = {
  Headers: globalThis.Headers,
  ReadableStream: globalThis.ReadableStream,
  Request: globalThis.Request,
  Response: globalThis.Response,
  TransformStream: globalThis.TransformStream,
  WritableStream: globalThis.WritableStream,
};

Object.assign(globalThis, {
  ReadableStream: NodeReadableStream,
  TransformStream: NodeTransformStream,
  WritableStream: NodeWritableStream,
});

const {
  Headers: EdgeHeaders,
  Request: EdgeRequest,
  Response: EdgeResponse,
} = jest.requireActual('next/dist/compiled/@edge-runtime/primitives/fetch');

const token = 'contract-test-service-token-that-is-long-enough-123456';
const binding = { workspaceKey: 'eeo', conversationId: 'a'.repeat(24), channel: 'widget' };
const handle = `eih_${'A'.repeat(43)}`;
const requestId = `bsr_${'a'.repeat(24)}`;

type ToolResult = { isError?: boolean; content: Array<{ type: string; text: string }> };

async function rpc(method: string, params: Record<string, unknown>) {
  const { POST } = await import('@/app/api/mcp/support/route');
  const response = await POST(
    new EdgeRequest('https://egypt-excursionsonline.com/api/mcp/support', {
      method: 'POST',
      headers: new EdgeHeaders({
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${token}`,
      }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    }) as never,
  );
  expect(response.status).toBe(200);
  return response.json();
}

async function callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const body = await rpc('tools/call', { name, arguments: args });
  return body.result;
}

describe('EEO support MCP tool contract', () => {
  const connectorEnv = {
    FOXESCONNECT_SUPPORT_MCP_TOKEN: token,
    FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET: 'contract-test-handle-secret-that-is-long-enough-123456',
    FOXESCONNECT_SUPPORT_MCP_TENANT_ID: 'default',
    FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY: 'eeo',
  };
  const originalEnv = Object.fromEntries(Object.keys(connectorEnv).map((key) => [key, process.env[key]]));

  beforeAll(() => {
    Object.assign(globalThis, { Headers: EdgeHeaders, Request: EdgeRequest, Response: EdgeResponse });
    Object.assign(process.env, connectorEnv);
  });

  beforeEach(() => {
    mockHandlerCalls.length = 0;
  });

  afterAll(() => {
    Object.assign(globalThis, originalWebGlobals);
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('advertises the input schemas recorded before the zod 4 upgrade', async () => {
    const body = await rpc('tools/list', {});
    const advertised = Object.fromEntries(
      (body.result.tools as Array<{ name: string; inputSchema: unknown }>).map((tool) => [tool.name, tool.inputSchema]),
    );
    expect(advertised).toEqual(recordedInputSchemas);
  });

  it('hands the booking code trimmed and normalised arguments', async () => {
    const result = await callTool('verify_booking_identity', {
      reference: '  EEO-REF-1234567  ',
      proofType: 'verified_email',
      proofValue: ' guest@example.com ',
      verificationId: 'verif:1234567',
      binding: { ...binding, workspaceKey: '  EEO ' },
    });

    expect(result.isError).toBeUndefined();
    expect(mockHandlerCalls).toEqual([
      {
        handler: 'verifySupportBookingIdentity',
        input: {
          reference: 'EEO-REF-1234567',
          proofType: 'verified_email',
          proofValue: 'guest@example.com',
          verificationId: 'verif:1234567',
          binding,
        },
      },
    ]);
  });

  it.each<[string, string, Record<string, unknown>, string]>([
    [
      'an unknown top-level key',
      'verify_booking_identity',
      { reference: 'EEO-REF-1234567', proofType: 'verified_email', proofValue: 'guest@example.com', verificationId: 'verif:1234567', binding, extra: 1 },
      'extra',
    ],
    ['an unknown binding key', 'get_booking_support_summary', { handle, binding: { ...binding, tenantId: 'other' } }, 'tenantId'],
    ['a malformed identity handle', 'get_pickup_support_status', { handle: 'eih_short', binding }, 'at handle'],
    [
      'an unknown action kind',
      'propose_booking_support_request',
      { handle, actionKind: 'refund_now', customerRequest: 'Please help', language: 'en', idempotencyKey: 'idem:12345678', binding },
      'at actionKind',
    ],
    [
      'an over-long customer request',
      'propose_booking_support_request',
      { handle, actionKind: 'resend_voucher', customerRequest: 'x'.repeat(601), language: 'en', idempotencyKey: 'idem:12345678', binding },
      'at customerRequest',
    ],
    ['a missing withdrawal reason', 'withdraw_booking_support_request', { requestId, binding }, 'at reason'],
    [
      'a non-text approver',
      'confirm_booking_support_request',
      { requestId, idempotencyKey: 'idem:12345678', approvedBy: 42, binding },
      'at approvedBy',
    ],
  ])('rejects %s before any booking code runs', async (_label, name, args, detail) => {
    const result = await callTool(name, args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/^MCP error -32602: Input validation error/);
    expect(result.content[0].text).toContain(detail);
    expect(mockHandlerCalls).toEqual([]);
  });
});
