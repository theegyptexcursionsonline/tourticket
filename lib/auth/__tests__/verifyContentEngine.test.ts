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

import { verifyContentEngineTenant } from '@/lib/auth/verifyContentEngine';
import { registerAdminAuditActor } from '@/lib/admin/adminAudit';

const mockRegisterAdminAuditActor = registerAdminAuditActor as jest.MockedFunction<
  typeof registerAdminAuditActor
>;

describe('verifyContentEngineTenant', () => {
  const priorAllowlist = process.env.CONTENT_ENGINE_ALLOWED_TENANTS;

  afterEach(() => {
    mockRegisterAdminAuditActor.mockClear();
    if (priorAllowlist === undefined) {
      delete process.env.CONTENT_ENGINE_ALLOWED_TENANTS;
    } else {
      process.env.CONTENT_ENGINE_ALLOWED_TENANTS = priorAllowlist;
    }
  });

  it('defaults to the flagship tenant when no allowlist is configured', () => {
    delete process.env.CONTENT_ENGINE_ALLOWED_TENANTS;

    expect(verifyContentEngineTenant(undefined)).toEqual({
      ok: true,
      tenantId: 'default',
    });
    expect(mockRegisterAdminAuditActor).toHaveBeenCalledWith(
      expect.objectContaining({ tenantIds: ['default'] }),
      { fallbackTenantIds: ['default'] },
    );
  });

  it('authorizes only explicitly configured non-default tenants', async () => {
    process.env.CONTENT_ENGINE_ALLOWED_TENANTS = 'default, makadi-bay';

    expect(verifyContentEngineTenant(' makadi-bay ')).toEqual({
      ok: true,
      tenantId: 'makadi-bay',
    });

    const denied = verifyContentEngineTenant('el-gouna');
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(422);
      await expect(denied.response.json()).resolves.toEqual({
        error: 'Content tenant is not enabled',
      });
    }
  });

  it.each([{}, [], 12, 'bad tenant', '../default', 'a'.repeat(129)])(
    'rejects malformed tenant input %p',
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

  it('fails closed when the configured allowlist is malformed', async () => {
    process.env.CONTENT_ENGINE_ALLOWED_TENANTS = 'default,bad tenant';

    const denied = verifyContentEngineTenant('default');
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.response.status).toBe(503);
      await expect(denied.response.json()).resolves.toEqual({
        error: 'Content engine tenant allowlist is misconfigured',
      });
    }
  });
});
