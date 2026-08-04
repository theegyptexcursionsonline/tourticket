jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/SupportIdentityHandle', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  consumeAbuseLimit: jest.fn(),
}));

import {
  authenticateSupportMcp,
  getBookingSupportSummary,
  getPickupSupportStatus,
  revokeSupportIdentity,
  type SupportMcpConfig,
  verifySupportBookingIdentity,
} from '@/lib/supportMcp';

const config: SupportMcpConfig = {
  apiToken: 'test-service-token-that-is-long-enough-123456',
  handleSecret: 'test-handle-secret-that-is-long-enough-123456',
  tenantId: 'default',
  workspaceKey: 'eeo',
};

const bookingId = '66a000000000000000000001' as never;
const handleId = '66a000000000000000000002' as never;
const binding = {
  workspaceKey: 'eeo',
  conversationId: '66b000000000000000000001',
  channel: 'whatsapp' as const,
};
const now = new Date('2026-08-04T10:01:00.000Z');

function allowedLimit() {
  return Promise.resolve({ allowed: true, count: 1, limit: 8, retryAfterSeconds: 60 });
}

function booking(overrides: Record<string, unknown> = {}) {
  return {
    _id: bookingId,
    tenantId: 'default',
    bookingReference: 'EEO-ABC123-01-9F8E7D6C',
    tour: { title: 'Coral Bay Morning Cruise' },
    user: { email: 'alex.rivera@example.test', phone: '+20 100 555 0178' },
    customerPhone: '+20 100 555 0178',
    dateString: '2026-08-19',
    time: '08:30',
    status: 'Confirmed',
    selectedBookingOption: { title: 'Morning departure' },
    pickupLocation: 'Marina reception',
    hotelPickupLocation: {
      name: 'Marina reception',
      address: 'Must never leave the source',
      lat: 27.1,
      lng: 33.8,
    },
    updatedAt: new Date('2026-08-04T09:45:00.000Z'),
    totalPrice: 999,
    paymentId: 'private-payment-id',
    internalNotes: 'private operator note',
    emergencyContact: 'private contact',
    ...overrides,
  };
}

describe('TourTicket support MCP identity boundary', () => {
  it('authenticates only the configured constant-time Bearer token and fails closed when unconfigured', () => {
    const previous = { ...process.env };
    process.env.FOXESCONNECT_SUPPORT_MCP_TOKEN = config.apiToken;
    process.env.FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET = config.handleSecret;
    process.env.FOXESCONNECT_SUPPORT_MCP_TENANT_ID = config.tenantId;
    process.env.FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY = config.workspaceKey;

    const valid = authenticateSupportMcp({
      headers: { get: (name: string) => (name === 'authorization' ? `Bearer ${config.apiToken}` : null) },
    } as Request);
    const invalid = authenticateSupportMcp({
      headers: {
        get: (name: string) =>
          name === 'authorization' ? 'Bearer wrong-token-that-is-long-enough-123456' : null,
      },
    } as Request);
    expect(valid.ok).toBe(true);
    expect(invalid).toEqual({ ok: false, status: 401 });

    delete process.env.FOXESCONNECT_SUPPORT_MCP_TOKEN;
    expect(authenticateSupportMcp({ headers: { get: () => null } } as unknown as Request)).toEqual({
      ok: false,
      status: 503,
    });
    process.env = previous;
  });

  it('verifies the provider-owned WhatsApp number and issues a stable conversation-bound opaque handle', async () => {
    const persistHandle = jest.fn().mockResolvedValue(undefined);
    const findBookingByReference = jest.fn().mockResolvedValue(booking());
    const input = {
      reference: 'eeo-abc123-01-9f8e7d6c',
      proofType: 'provider_phone' as const,
      proofValue: '+20 (100) 555-0178',
      verificationId: 'ai-run:64f000000000000000000001',
      binding,
    };
    const deps = {
      now: () => now,
      consumeLimit: allowedLimit,
      findBookingByReference,
      persistHandle,
    };

    const first = await verifySupportBookingIdentity(input, config, deps);
    const replay = await verifySupportBookingIdentity(input, config, deps);
    const nextVerification = await verifySupportBookingIdentity(
      { ...input, verificationId: 'ai-run:64f000000000000000000003' },
      config,
      deps,
    );

    expect(first).toEqual(replay);
    expect(first).toMatchObject({
      verified: true,
      bookingReferenceMask: 'EEO-••••-7D6C',
      allowedTools: ['booking_summary', 'pickup_status'],
    });
    expect(first.verified && first.handle).toMatch(/^eih_[A-Za-z0-9_-]{43}$/);
    expect(first.verified && nextVerification.verified && nextVerification.handle).not.toBe(first.verified && first.handle);
    expect(findBookingByReference).toHaveBeenCalledWith('EEO-ABC123-01-9F8E7D6C', 'default');
    expect(persistHandle).toHaveBeenCalledTimes(3);
    expect(persistHandle.mock.calls[0][0]).toMatchObject({ bookingId, config, binding });
  });

  it('returns the same enumeration-safe result for missing, mismatched, injected and rate-limited proofs', async () => {
    const findBookingByReference = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(booking())
      .mockResolvedValueOnce(booking());
    const base = {
      proofType: 'verified_email' as const,
      verificationId: 'widget-challenge:64f000000000000000000002',
      binding: { ...binding, channel: 'widget' as const },
    };
    const deps = {
      now: () => now,
      consumeLimit: allowedLimit,
      findBookingByReference,
      persistHandle: jest.fn(),
    };

    const missing = await verifySupportBookingIdentity(
      { ...base, reference: 'EEO-NOTFOUND-01-12345678', proofValue: 'casey@example.test' },
      config,
      deps,
    );
    const mismatch = await verifySupportBookingIdentity(
      { ...base, reference: 'EEO-ABC123-01-9F8E7D6C', proofValue: 'casey@example.test' },
      config,
      deps,
    );
    const injection = await verifySupportBookingIdentity(
      {
        ...base,
        reference: "EEO-ABC123' || true || '",
        proofValue: 'alex.rivera@example.test',
      },
      config,
      deps,
    );
    const limited = await verifySupportBookingIdentity(
      { ...base, reference: 'EEO-ABC123-01-9F8E7D6C', proofValue: 'alex.rivera@example.test' },
      config,
      {
        ...deps,
        consumeLimit: async () => ({ allowed: false, count: 9, limit: 8, retryAfterSeconds: 60 }),
      },
    );

    const generic = { verified: false, code: 'IDENTITY_NOT_VERIFIED' };
    expect(missing).toEqual(generic);
    expect(mismatch).toEqual(generic);
    expect(injection).toEqual(generic);
    expect(limited).toEqual(generic);
    expect(deps.persistHandle).not.toHaveBeenCalled();
  });

  it('returns only the approved booking summary fields after a matching handle and tenant-bound re-read', async () => {
    const summary = await getBookingSupportSummary(
      { handle: `eih_${'A'.repeat(43)}`, binding },
      config,
      {
        now: () => now,
        findHandle: jest.fn().mockResolvedValue({
          _id: handleId,
          booking: bookingId,
          allowedTools: ['booking_summary', 'pickup_status'],
          expiresAt: new Date(now.getTime() + 60_000),
        }),
        findBookingById: jest.fn().mockResolvedValue(booking()),
        touchHandle: jest.fn(),
      },
    );

    expect(summary).toEqual({
      bookingReferenceMask: 'EEO-••••-7D6C',
      status: 'Confirmed',
      tourTitle: 'Coral Bay Morning Cruise',
      optionTitle: 'Morning departure',
      serviceDate: '2026-08-19',
      serviceTime: '08:30',
      dataFreshAt: '2026-08-04T10:01:00.000Z',
    });
    expect(JSON.stringify(summary)).not.toMatch(/alex|price|payment|internal|emergency|555/i);
  });

  it('returns a label-only pickup result and never invents pickup time or driver status', async () => {
    const pickup = await getPickupSupportStatus(
      { handle: `eih_${'B'.repeat(43)}`, binding },
      config,
      {
        now: () => now,
        findHandle: jest.fn().mockResolvedValue({
          _id: handleId,
          booking: bookingId,
          allowedTools: ['booking_summary', 'pickup_status'],
          expiresAt: new Date(now.getTime() + 60_000),
        }),
        findBookingById: jest.fn().mockResolvedValue(booking()),
        touchHandle: jest.fn(),
      },
    );

    expect(pickup).toEqual({
      bookingReferenceMask: 'EEO-••••-7D6C',
      pickupStatus: 'confirmed',
      pickupLocationLabel: 'Marina reception',
      pickupTime: null,
      dataFreshAt: '2026-08-04T10:01:00.000Z',
    });
    expect(JSON.stringify(pickup)).not.toMatch(/address|lat|lng|driver|private/i);
  });

  it('rejects a handle replayed against another tenant binding, expired handle or unavailable joined tour', async () => {
    const findHandle = jest.fn();
    const wrongBinding = await getBookingSupportSummary(
      {
        handle: `eih_${'C'.repeat(43)}`,
        binding: { ...binding, workspaceKey: 'another-workspace' },
      },
      config,
      { findHandle },
    );
    expect(wrongBinding).toBeNull();
    expect(findHandle).not.toHaveBeenCalled();

    const expired = await getBookingSupportSummary(
      { handle: `eih_${'C'.repeat(43)}`, binding },
      config,
      { findHandle: jest.fn().mockResolvedValue(null) },
    );
    expect(expired).toBeNull();

    const badJoin = await getBookingSupportSummary(
      { handle: `eih_${'C'.repeat(43)}`, binding },
      config,
      {
        findHandle: jest.fn().mockResolvedValue({
          _id: handleId,
          booking: bookingId,
          allowedTools: ['booking_summary'],
          expiresAt: new Date(now.getTime() + 60_000),
        }),
        findBookingById: jest.fn().mockResolvedValue(booking({ tour: null })),
      },
    );
    expect(badJoin).toBeNull();
  });

  it('revokes only a syntactically valid handle with the exact conversation binding', async () => {
    const revokeHandle = jest.fn().mockResolvedValue(true);
    const valid = await revokeSupportIdentity(
      { handle: `eih_${'D'.repeat(43)}`, binding },
      config,
      { now: () => now, revokeHandle },
    );
    const wrong = await revokeSupportIdentity(
      { handle: `eih_${'D'.repeat(43)}`, binding: { ...binding, conversationId: 'not-an-id' } },
      config,
      { now: () => now, revokeHandle },
    );
    expect(valid).toEqual({ revoked: true });
    expect(wrong).toEqual({ revoked: false });
    expect(revokeHandle).toHaveBeenCalledTimes(1);
  });
});
