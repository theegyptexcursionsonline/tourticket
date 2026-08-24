jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    private readonly body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }

    async json() {
      return this.body;
    }

    static json(body: unknown, init?: { status?: number }) {
      return new MockNextResponse(body, init);
    }
  }

  return { NextResponse: MockNextResponse, NextRequest: jest.fn() };
});
jest.mock('@/lib/admin/adminAudit', () => ({ registerAdminAuditActor: jest.fn() }));

import {
  verifyContentEngine,
  verifyContentEngineTenant,
} from '@/lib/auth/verifyContentEngine';
import { registerAdminAuditActor } from '@/lib/admin/adminAudit';

const mockRegisterAdminAuditActor = registerAdminAuditActor as jest.MockedFunction<
  typeof registerAdminAuditActor
>;

function request(authorization: string | null) {
  return {
    headers: {
      get(name: string) {
        return name.toLowerCase() === 'authorization' ? authorization : null;
      },
    },
  } as never;
}

describe('verifyContentEngine bearer boundary', () => {
  const priorKey = process.env.CONTENT_ENGINE_API_KEY;

  afterEach(() => {
    if (priorKey === undefined) delete process.env.CONTENT_ENGINE_API_KEY;
    else process.env.CONTENT_ENGINE_API_KEY = priorKey;
  });

  it('fails closed when the receiver credential is not configured', async () => {
    delete process.env.CONTENT_ENGINE_API_KEY;
    const denied = verifyContentEngine(request('Bearer anything'));
    expect(denied?.status).toBe(503);
    await expect(denied?.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringContaining('not configured') }),
    );
  });

  it('rejects missing, malformed and incorrect credentials', () => {
    process.env.CONTENT_ENGINE_API_KEY = 'four-ascii-bytes';
    expect(verifyContentEngine(request(null))?.status).toBe(401);
    expect(verifyContentEngine(request('Basic four-ascii-bytes'))?.status).toBe(401);
    expect(verifyContentEngine(request('Bearer wrong'))?.status).toBe(401);
  });

  it('compares UTF-8 byte lengths before timingSafeEqual', () => {
    process.env.CONTENT_ENGINE_API_KEY = 'aaaa';
    expect(() => verifyContentEngine(request('Bearer éééé'))).not.toThrow();
    expect(verifyContentEngine(request('Bearer éééé'))?.status).toBe(401);
  });

  it('accepts only the exact configured bearer token', () => {
    process.env.CONTENT_ENGINE_API_KEY = 'receiver-secret';
    expect(verifyContentEngine(request('Bearer receiver-secret'))).toBeNull();
  });
});

describe('verifyContentEngineTenant', () => {
  const priorAllowlist = process.env.CONTENT_ENGINE_ALLOWED_TENANTS;

  beforeEach(() => {
    process.env.CONTENT_ENGINE_ALLOWED_TENANTS = 'default';
  });

  afterEach(() => {
    mockRegisterAdminAuditActor.mockClear();
    if (priorAllowlist === undefined) {
      delete process.env.CONTENT_ENGINE_ALLOWED_TENANTS;
    } else {
      process.env.CONTENT_ENGINE_ALLOWED_TENANTS = priorAllowlist;
    }
  });

  it('authorizes only the exact flagship tenant and registers its audit scope', () => {
    expect(verifyContentEngineTenant(' default ')).toEqual({
      ok: true,
      tenantId: 'default',
    });
    expect(mockRegisterAdminAuditActor).toHaveBeenCalledWith(
      expect.objectContaining({ tenantIds: ['default'] }),
      { fallbackTenantIds: ['default'] },
    );
  });

  it.each([undefined, null, '', '   ', {}, [], 12, 'bad tenant', '../default', 'a'.repeat(129)])(
    'rejects missing or malformed tenant input %p',
    async (input) => {
      const denied = verifyContentEngineTenant(input);
      expect(denied.ok).toBe(false);
      if (!denied.ok) {
        expect(denied.response.status).toBe(422);
        await expect(denied.response.json()).resolves.toEqual({ error: 'Invalid tenantId' });
      }
      expect(mockRegisterAdminAuditActor).not.toHaveBeenCalled();
    },
  );

  it('rejects a network tenant in the flagship receiver', async () => {
    const denied = verifyContentEngineTenant('makadi-bay');
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(422);
      await expect(denied.response.json()).resolves.toEqual({
        error: 'Content tenant is not enabled',
      });
    }
  });

  it.each([undefined, '', 'default,makadi-bay', 'makadi-bay', 'bad tenant'])(
    'fails closed for missing or misconfigured allowlist %p',
    async (configured) => {
      if (configured === undefined) delete process.env.CONTENT_ENGINE_ALLOWED_TENANTS;
      else process.env.CONTENT_ENGINE_ALLOWED_TENANTS = configured;

      const denied = verifyContentEngineTenant('default');
      expect(denied.ok).toBe(false);
      if (!denied.ok) {
        expect(denied.response.status).toBe(503);
        await expect(denied.response.json()).resolves.toEqual({
          error: 'Content engine tenant allowlist is missing or misconfigured',
        });
      }
      expect(mockRegisterAdminAuditActor).not.toHaveBeenCalled();
    },
  );
});
