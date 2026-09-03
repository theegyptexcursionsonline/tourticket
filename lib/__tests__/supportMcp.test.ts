jest.mock('@/lib/dbConnect', () => jest.fn().mockResolvedValue(undefined));
jest.mock('@/lib/models/Booking', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/user', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/SupportIdentityHandle', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/BookingSupportRequest', () => ({
  __esModule: true,
  default: {},
  BOOKING_SUPPORT_ACTION_KINDS: ['request_pickup_change', 'request_booking_change', 'request_cancellation', 'request_human_callback', 'resend_voucher'],
  BOOKING_SUPPORT_REQUEST_STATUSES: ['proposed', 'received', 'withdrawn', 'in_progress', 'resolved'],
}));
jest.mock('@/lib/security/distributedAbuseLimit', () => ({
  consumeAbuseLimit: jest.fn(),
}));

import {
  authenticateSupportMcp,
  confirmBookingSupportRequest,
  type SupportRequestRecord,
  type SupportRequestStatus,
  proposeBookingSupportRequest,
  withdrawBookingSupportRequest,
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
      allowedTools: ['booking_summary', 'pickup_status', 'booking_action'],
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

  describe('ops requests (suggest-then-approve)', () => {
    const handle = `eih_${'F'.repeat(43)}`;
    function requestDeps(overrides: Record<string, unknown> = {}) {
      const store = new Map<string, SupportRequestRecord>();
      return {
        now: () => now,
        findHandle: jest.fn().mockResolvedValue({ _id: handleId, booking: bookingId, allowedTools: ['booking_summary', 'pickup_status', 'booking_action'], expiresAt: new Date(now.getTime() + 60_000) }),
        findBookingById: jest.fn().mockResolvedValue(booking()),
        touchHandle: jest.fn().mockResolvedValue(undefined),
        findSupportRequestByKey: jest.fn(async ({ idempotencyKey }: { idempotencyKey: string }) => store.get(`key:${idempotencyKey}`) ?? null),
        persistSupportRequest: jest.fn(async (input: { requestId: string; idempotencyKey: string }) => {
          if (store.has(`key:${input.idempotencyKey}`)) return 'duplicate' as const;
          const row: SupportRequestRecord = { requestId: input.requestId, status: 'proposed' };
          store.set(`key:${input.idempotencyKey}`, row);
          store.set(`id:${input.requestId}`, row);
          return row;
        }),
        findSupportRequestById: jest.fn(async ({ requestId }: { requestId: string }) => store.get(`id:${requestId}`) ?? null),
        transitionSupportRequest: jest.fn(async ({ requestId, from, set }: { requestId: string; from: readonly SupportRequestStatus[]; set: Record<string, unknown> }) => {
          const row = store.get(`id:${requestId}`);
          if (!row || !from.includes(row.status)) return null;
          row.status = set.status as SupportRequestStatus;
          return row;
        }),
        store,
        ...overrides,
      };
    }

    it('registers a PROPOSED request for a live handle with the booking_action grant, idempotently', async () => {
      const deps = requestDeps();
      const input = { handle, actionKind: 'request_pickup_change', customerRequest: 'Please move my pickup to 9am', language: 'en', idempotencyKey: 'action:64f000000000000000000001:request_pickup_change', binding };
      const first = await proposeBookingSupportRequest(input, config, deps);
      expect(first).toMatchObject({ status: 'proposed' });
      expect('requestId' in first && /^bsr_[a-f0-9]{24}$/.test(first.requestId)).toBe(true);
      expect(deps.findHandle).toHaveBeenCalledWith(expect.objectContaining({ tool: 'booking_action' }));
      expect(deps.persistSupportRequest).toHaveBeenCalledWith(expect.objectContaining({ bookingId, bookingReference: 'EEO-ABC123-01-9F8E7D6C', actionKind: 'request_pickup_change' }));
      const again = await proposeBookingSupportRequest(input, config, deps);
      expect(again).toEqual({ requestId: (first as { requestId: string }).requestId, status: 'duplicate' });
      expect(deps.persistSupportRequest).toHaveBeenCalledTimes(1);
    });

    it('fails closed without a valid handle grant and on unsupported kinds', async () => {
      const deps = requestDeps({ findHandle: jest.fn().mockResolvedValue(null) });
      expect(await proposeBookingSupportRequest({ handle, actionKind: 'request_cancellation', customerRequest: 'cancel', language: 'en', idempotencyKey: 'action:64f000000000000000000002:request_cancellation', binding }, config, deps)).toEqual({ code: 'IDENTITY_REQUIRED', message: 'Booking identity is unavailable.' });
      expect(await proposeBookingSupportRequest({ handle, actionKind: 'delete_booking', customerRequest: 'x', language: 'en', idempotencyKey: 'action:64f000000000000000000003:delete', binding }, config, requestDeps())).toMatchObject({ code: 'INVALID_INPUT' });
      expect(deps.persistSupportRequest).not.toHaveBeenCalled();
    });

    it('confirms exactly once (later confirms are duplicates), withdraws idempotently, and refuses cross-binding ids', async () => {
      const deps = requestDeps();
      const proposed = await proposeBookingSupportRequest({ handle, actionKind: 'resend_voucher', customerRequest: 'I never got my voucher', language: 'en', idempotencyKey: 'action:64f000000000000000000004:resend_voucher', binding }, config, deps) as { requestId: string };
      expect(await confirmBookingSupportRequest({ requestId: proposed.requestId, idempotencyKey: 'k:confirm', approvedBy: 'owner@example.test', binding }, config, deps)).toEqual({ requestId: proposed.requestId, status: 'received' });
      expect(await confirmBookingSupportRequest({ requestId: proposed.requestId, idempotencyKey: 'k:confirm', approvedBy: 'owner@example.test', binding }, config, deps)).toEqual({ requestId: proposed.requestId, status: 'duplicate' });
      expect(await withdrawBookingSupportRequest({ requestId: proposed.requestId, reason: 'rejected', binding }, config, deps)).toEqual({ requestId: proposed.requestId, status: 'withdrawn' });
      expect(await withdrawBookingSupportRequest({ requestId: proposed.requestId, reason: 'rejected', binding }, config, deps)).toEqual({ requestId: proposed.requestId, status: 'withdrawn' });
      expect(await confirmBookingSupportRequest({ requestId: proposed.requestId, idempotencyKey: 'k:confirm', approvedBy: 'owner@example.test', binding }, config, deps)).toEqual({ requestId: proposed.requestId, status: 'withdrawn' });
      expect(await confirmBookingSupportRequest({ requestId: 'bsr_000000000000000000000000', idempotencyKey: 'k', approvedBy: 'x', binding }, config, deps)).toEqual({ code: 'NOT_FOUND', message: 'Request not found.' });
      expect(await confirmBookingSupportRequest({ requestId: proposed.requestId, idempotencyKey: 'k', approvedBy: 'x', binding: { ...binding, workspaceKey: 'other' } }, config, deps)).toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('never withdraws a request operations already started', async () => {
      const deps = requestDeps();
      const proposed = await proposeBookingSupportRequest({ handle, actionKind: 'request_human_callback', customerRequest: 'call me', language: 'en', idempotencyKey: 'action:64f000000000000000000005:request_human_callback', binding }, config, deps) as { requestId: string };
      await confirmBookingSupportRequest({ requestId: proposed.requestId, idempotencyKey: 'k', approvedBy: 'x', binding }, config, deps);
      deps.store.get(`id:${proposed.requestId}`)!.status = 'in_progress' as SupportRequestStatus;
      expect(await withdrawBookingSupportRequest({ requestId: proposed.requestId, reason: 'late', binding }, config, deps)).toMatchObject({ code: 'INVALID_STATE' });
    });
  });
});

