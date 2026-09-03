import {
  ReadableStream as NodeReadableStream,
  TransformStream as NodeTransformStream,
  WritableStream as NodeWritableStream,
} from 'node:stream/web';

jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));

export {};
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

function request(authorization?: string) {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? authorization || null : null),
    },
  } as never;
}

function postRequest(authorization?: string, body: Record<string, unknown> = {}) {
  const headers = new Headers({
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    ...(authorization ? { authorization } : {}),
  });
  return {
    method: 'POST',
    url: 'https://egypt-excursionsonline.com/api/mcp/support',
    headers,
    json: async () => body,
  } as never;
}

describe('private EEO booking-support MCP route', () => {
  const original = {
    token: process.env.FOXESCONNECT_SUPPORT_MCP_TOKEN,
    handle: process.env.FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET,
    tenant: process.env.FOXESCONNECT_SUPPORT_MCP_TENANT_ID,
    workspace: process.env.FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY,
  };
  const token = 'route-test-service-token-that-is-long-enough-123456';

  beforeAll(() => {
    Object.assign(globalThis, {
      Headers: EdgeHeaders,
      Request: EdgeRequest,
      Response: EdgeResponse,
    });
  });

  beforeEach(() => {
    jest.resetModules();
    process.env.FOXESCONNECT_SUPPORT_MCP_TOKEN = token;
    process.env.FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET =
      'route-test-handle-secret-that-is-long-enough-123456';
    process.env.FOXESCONNECT_SUPPORT_MCP_TENANT_ID = 'default';
    process.env.FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY = 'eeo';
  });

  afterAll(() => {
    Object.assign(globalThis, originalWebGlobals);
    if (original.token === undefined) delete process.env.FOXESCONNECT_SUPPORT_MCP_TOKEN;
    else process.env.FOXESCONNECT_SUPPORT_MCP_TOKEN = original.token;
    if (original.handle === undefined) delete process.env.FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET;
    else process.env.FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET = original.handle;
    if (original.tenant === undefined) delete process.env.FOXESCONNECT_SUPPORT_MCP_TENANT_ID;
    else process.env.FOXESCONNECT_SUPPORT_MCP_TENANT_ID = original.tenant;
    if (original.workspace === undefined) delete process.env.FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY;
    else process.env.FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY = original.workspace;
  });

  it('fails closed without a valid service Bearer token', async () => {
    const { GET } = await import('@/app/api/mcp/support/route');
    const missing = await GET(request());
    const wrong = await GET(request('Bearer definitely-wrong'));
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(missing.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns authenticated connector metadata without exposing secrets or a driver tool', async () => {
    const { GET } = await import('@/app/api/mcp/support/route');
    const response = await GET(request(`Bearer ${token}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      server: { name: 'eeo-booking-support', version: '1.0.0' },
      workspaceKey: 'eeo',
      tenantId: 'default',
      bookingData: 'read-only; ops requests via FoxesConnect approval (never booking mutations)',
      driverToolAvailable: false,
    });
    expect(body.tools).toEqual([
      'verify_booking_identity',
      'get_booking_support_summary',
      'get_pickup_support_status',
      'revoke_booking_identity',
      'propose_booking_support_request',
      'confirm_booking_support_request',
      'withdraw_booking_support_request',
    ]);
    expect(JSON.stringify(body)).not.toContain(token);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns 503 when any security-critical connector setting is missing', async () => {
    delete process.env.FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET;
    const { GET } = await import('@/app/api/mcp/support/route');
    const response = await GET(request(`Bearer ${token}`));
    expect(response.status).toBe(503);
  });

  it('completes an authenticated stateless MCP initialize handshake', async () => {
    const { POST } = await import('@/app/api/mcp/support/route');
    const response = await POST(
      postRequest(`Bearer ${token}`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'foxesconnect-route-test', version: '1.0.0' },
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-11-25',
        serverInfo: { name: 'eeo-booking-support', version: '1.0.0' },
      },
    });
  });

  it('lists the read tools plus the three idempotent ops-request tools with truthful annotations', async () => {
    const { POST } = await import('@/app/api/mcp/support/route');
    const response = await POST(postRequest(`Bearer ${token}`, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }));
    const body = await response.json();
    expect(response.status).toBe(200);
    const tools = body.result.tools as Array<{ name: string; annotations?: Record<string, boolean> }>;
    const names = tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(['verify_booking_identity', 'get_booking_support_summary', 'get_pickup_support_status', 'revoke_booking_identity', 'propose_booking_support_request', 'confirm_booking_support_request', 'withdraw_booking_support_request']));
    for (const name of ['propose_booking_support_request', 'confirm_booking_support_request', 'withdraw_booking_support_request']) {
      expect(tools.find((tool) => tool.name === name)?.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    }
    expect(tools.find((tool) => tool.name === 'get_booking_support_summary')?.annotations).toMatchObject({ readOnlyHint: true });
  });

  it('blocks MCP POST before protocol handling when service authentication fails', async () => {
    const { POST } = await import('@/app/api/mcp/support/route');
    const response = await POST(
      postRequest(undefined, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: 'Authentication required' },
    });
  });
});
