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
  authenticateContentEngineMutation,
  CONTENT_ENGINE_MUTATION_HEADERS,
  verifyContentEngine,
  verifyContentEngineMutationTarget,
  verifyContentEngineTenant,
} from '@/lib/auth/verifyContentEngine';
import { registerAdminAuditActor } from '@/lib/admin/adminAudit';

const mockRegisterAdminAuditActor = registerAdminAuditActor as jest.MockedFunction<
  typeof registerAdminAuditActor
>;

function request(
  authorization: string | null,
  extraHeaders: Record<string, string> = {},
  method?: string,
) {
  const headers = new Map(
    Object.entries(extraHeaders).map(([name, value]) => [name.toLowerCase(), value]),
  );
  return {
    method,
    headers: {
      get(name: string) {
        return name.toLowerCase() === 'authorization'
          ? authorization
          : headers.get(name.toLowerCase()) ?? null;
      },
    },
  } as never;
}

const exactTargetHeaders = {
  [CONTENT_ENGINE_MUTATION_HEADERS.receiverType]: 'blog',
  [CONTENT_ENGINE_MUTATION_HEADERS.tenant]: 'default',
  [CONTENT_ENGINE_MUTATION_HEADERS.locale]: 'en',
};

function registry(...grants: unknown[]) {
  return JSON.stringify({ version: 1, grants });
}

function methodRegistry(...grants: unknown[]) {
  return JSON.stringify({ version: 2, grants });
}

function grant(
  id: string,
  secretEnv: string,
  receiverType: 'blog' | 'destination' | 'category' = 'blog',
) {
  return {
    id,
    secretEnv,
    targets: [{ receiverType, tenantId: 'default', locale: 'en' }],
  };
}

function methodGrant(
  id: string,
  secretEnv: string,
  method: 'POST' | 'PUT',
  receiverType: 'blog' | 'destination' | 'category' = 'blog',
) {
  return {
    id,
    secretEnv,
    targets: [{ method, receiverType, tenantId: 'default', locale: 'en' }],
  };
}

describe('content engine mutation grants', () => {
  const envNames = [
    'CONTENT_ENGINE_API_KEY',
    'CONTENT_ENGINE_API_KEY_NEXT',
    'CONTENT_ENGINE_RECEIVER_GRANTS_JSON',
  ] as const;
  const prior = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));

  beforeEach(() => {
    process.env.CONTENT_ENGINE_API_KEY = 'receiver-primary-secret';
    process.env.CONTENT_ENGINE_API_KEY_NEXT = 'receiver-next-secret';
    process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = registry(
      grant('primary', 'CONTENT_ENGINE_API_KEY'),
    );
  });

  afterEach(() => {
    for (const name of envNames) {
      const value = prior[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('accepts the exact blog/default/en header, body and grant tuple', () => {
    const authenticated = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret', exactTargetHeaders),
    );
    expect(authenticated.ok).toBe(true);
    if (!authenticated.ok) return;

    expect(verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret', exactTargetHeaders),
      authenticated.credential,
      { method: 'POST', receiverType: 'blog', tenantId: 'default', locale: 'en' },
    )).toBeNull();
  });

  it('keeps version 1 grants POST-only and requires an explicit version 2 PUT grant', () => {
    const v1 = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret', exactTargetHeaders, 'PUT'),
    );
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret', exactTargetHeaders, 'PUT'),
      v1.credential,
      { method: 'PUT', receiverType: 'blog', tenantId: 'default', locale: 'en' },
    )?.status).toBe(403);

    process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = methodRegistry(
      methodGrant('primary', 'CONTENT_ENGINE_API_KEY', 'PUT'),
    );
    const v2 = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret', exactTargetHeaders, 'PUT'),
    );
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;
    expect(verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret', exactTargetHeaders, 'PUT'),
      v2.credential,
      { method: 'PUT', receiverType: 'blog', tenantId: 'default', locale: 'en' },
    )).toBeNull();
  });

  it('rejects disagreement between the actual request method and route contract', () => {
    process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = methodRegistry(
      methodGrant('primary', 'CONTENT_ENGINE_API_KEY', 'PUT'),
    );
    const authenticated = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret', exactTargetHeaders, 'POST'),
    );
    expect(authenticated.ok).toBe(true);
    if (!authenticated.ok) return;
    expect(verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret', exactTargetHeaders, 'POST'),
      authenticated.credential,
      { method: 'PUT', receiverType: 'blog', tenantId: 'default', locale: 'en' },
    )?.status).toBe(422);
  });

  it('supports two distinct credentials for overlap during rotation', () => {
    process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = registry(
      grant('primary', 'CONTENT_ENGINE_API_KEY'),
      grant('next', 'CONTENT_ENGINE_API_KEY_NEXT'),
    );

    expect(authenticateContentEngineMutation(request('Bearer receiver-primary-secret')).ok).toBe(true);
    expect(authenticateContentEngineMutation(request('Bearer receiver-next-secret')).ok).toBe(true);
    expect(verifyContentEngine(request('Bearer receiver-primary-secret'))).toBeNull();
    expect(verifyContentEngine(request('Bearer receiver-next-secret'))).toBeNull();
  });

  it('keeps the legacy global credential unable to authorize an unbound mutation', async () => {
    delete process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON;
    const denied = authenticateContentEngineMutation(request('Bearer receiver-primary-secret'));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.response.status).toBe(503);
  });

  it.each([
    ['wrong route type', { method: 'POST', receiverType: 'destination', tenantId: 'default', locale: 'en' }],
    ['wrong tenant', { method: 'POST', receiverType: 'blog', tenantId: 'network', locale: 'en' }],
    ['wrong locale', { method: 'POST', receiverType: 'blog', tenantId: 'default', locale: 'de' }],
  ])('rejects %s when headers do not agree with the body', async (_label, bodyTarget) => {
    const authenticated = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret', exactTargetHeaders),
    );
    expect(authenticated.ok).toBe(true);
    if (!authenticated.ok) return;

    const denied = verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret', exactTargetHeaders),
      authenticated.credential,
      bodyTarget as never,
    );
    expect(denied?.status).toBe(422);
  });

  it('rejects a matching route/body/header tuple outside the credential grant', () => {
    const destinationHeaders = {
      ...exactTargetHeaders,
      [CONTENT_ENGINE_MUTATION_HEADERS.receiverType]: 'destination',
    };
    const authenticated = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret', destinationHeaders),
    );
    expect(authenticated.ok).toBe(true);
    if (!authenticated.ok) return;

    const denied = verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret', destinationHeaders),
      authenticated.credential,
      { method: 'POST', receiverType: 'destination', tenantId: 'default', locale: 'en' },
    );
    expect(denied?.status).toBe(403);
  });

  it('requires all three target headers', () => {
    const authenticated = authenticateContentEngineMutation(
      request('Bearer receiver-primary-secret'),
    );
    expect(authenticated.ok).toBe(true);
    if (!authenticated.ok) return;
    expect(verifyContentEngineMutationTarget(
      request('Bearer receiver-primary-secret'),
      authenticated.credential,
      { method: 'POST', receiverType: 'blog', tenantId: 'default', locale: 'en' },
    )?.status).toBe(422);
  });

  it.each([
    ['invalid JSON', '{'],
    ['empty grants', registry()],
    ['extra registry key', JSON.stringify({ version: 1, grants: [], extra: true })],
    ['duplicate grant id', registry(grant('same', 'CONTENT_ENGINE_API_KEY'), grant('same', 'CONTENT_ENGINE_API_KEY_NEXT'))],
    ['duplicate secret env', registry(grant('one', 'CONTENT_ENGINE_API_KEY'), grant('two', 'CONTENT_ENGINE_API_KEY'))],
    ['duplicate target', registry({ ...grant('one', 'CONTENT_ENGINE_API_KEY'), targets: [grant('x', 'CONTENT_ENGINE_API_KEY').targets[0], grant('x', 'CONTENT_ENGINE_API_KEY').targets[0]] })],
    ['overbroad tenant', registry({ ...grant('one', 'CONTENT_ENGINE_API_KEY'), targets: [{ receiverType: 'blog', tenantId: '*', locale: 'en' }] })],
    ['overbroad locale', registry({ ...grant('one', 'CONTENT_ENGINE_API_KEY'), targets: [{ receiverType: 'blog', tenantId: 'default', locale: '*' }] })],
    ['unsupported receiver', registry({ ...grant('one', 'CONTENT_ENGINE_API_KEY'), targets: [{ receiverType: 'tour', tenantId: 'default', locale: 'en' }] })],
    ['version 2 target without method', methodRegistry(grant('one', 'CONTENT_ENGINE_API_KEY'))],
    ['unsupported method', methodRegistry({ ...methodGrant('one', 'CONTENT_ENGINE_API_KEY', 'PUT'), targets: [{ method: 'PATCH', receiverType: 'blog', tenantId: 'default', locale: 'en' }] })],
    ['unsupported destination update', methodRegistry(methodGrant('one', 'CONTENT_ENGINE_API_KEY', 'PUT', 'destination'))],
  ])('fails closed for malformed or duplicate registry: %s', async (_label, value) => {
    process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = value;
    const denied = authenticateContentEngineMutation(request('Bearer receiver-primary-secret'));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.response.status).toBe(503);
  });

  it('fails closed on a malformed present registry for read-only recovery too', () => {
    process.env.CONTENT_ENGINE_RECEIVER_GRANTS_JSON = '{';
    expect(verifyContentEngine(request('Bearer receiver-primary-secret'))?.status).toBe(503);
  });
});

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
