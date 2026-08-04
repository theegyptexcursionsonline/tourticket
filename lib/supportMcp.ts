import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import SupportIdentityHandle, {
  type SupportIdentityChannel,
  type SupportIdentityTool,
} from '@/lib/models/SupportIdentityHandle';
import { consumeAbuseLimit } from '@/lib/security/distributedAbuseLimit';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const HANDLE_TTL_MS = 15 * 60 * 1_000;
const HANDLE_BUCKET_MS = 5 * 60 * 1_000;
const IDENTITY_WINDOW_MS = 15 * 60 * 1_000;

export type SupportProofType = 'provider_phone' | 'verified_email';

export type SupportBinding = {
  workspaceKey: string;
  conversationId: string;
  channel: SupportIdentityChannel;
};

export type SupportMcpConfig = {
  apiToken: string;
  handleSecret: string;
  tenantId: string;
  workspaceKey: string;
};

type SupportBookingRecord = {
  _id: mongoose.Types.ObjectId;
  bookingReference: string;
  tenantId?: string | null;
  tour?: { title?: string } | null;
  user?: { email?: string; phone?: string } | null;
  customerPhone?: string | null;
  date?: Date | string | null;
  dateString?: string | null;
  time?: string | null;
  status?: string | null;
  selectedBookingOption?: { title?: string } | null;
  pickupLocation?: string | null;
  hotelPickupLocation?: { name?: string | null } | null;
  updatedAt?: Date | string | null;
};

type SupportHandleRecord = {
  _id: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  allowedTools: SupportIdentityTool[];
  expiresAt: Date;
};

type SupportMcpDependencies = {
  now?: () => Date;
  findBookingByReference?: (reference: string, tenantId: string) => Promise<SupportBookingRecord | null>;
  findBookingById?: (id: mongoose.Types.ObjectId, tenantId: string) => Promise<SupportBookingRecord | null>;
  consumeLimit?: typeof consumeAbuseLimit;
  persistHandle?: (input: {
    tokenHash: string;
    bookingId: mongoose.Types.ObjectId;
    config: SupportMcpConfig;
    binding: SupportBinding;
    expiresAt: Date;
  }) => Promise<void>;
  findHandle?: (input: {
    tokenHash: string;
    config: SupportMcpConfig;
    binding: SupportBinding;
    tool: SupportIdentityTool;
    now: Date;
  }) => Promise<SupportHandleRecord | null>;
  touchHandle?: (id: mongoose.Types.ObjectId, now: Date) => Promise<void>;
  revokeHandle?: (tokenHash: string, config: SupportMcpConfig, binding: SupportBinding, now: Date) => Promise<boolean>;
};

export type VerifySupportIdentityResult =
  | {
      verified: true;
      handle: string;
      bookingReferenceMask: string;
      expiresAt: string;
      allowedTools: SupportIdentityTool[];
    }
  | { verified: false; code: 'IDENTITY_NOT_VERIFIED' };

export type BookingSupportSummary = {
  bookingReferenceMask: string;
  status: string;
  tourTitle: string;
  optionTitle: string | null;
  serviceDate: string | null;
  serviceTime: string | null;
  dataFreshAt: string;
};

export type PickupSupportStatus = {
  bookingReferenceMask: string;
  pickupStatus: 'confirmed' | 'not_recorded';
  pickupLocationLabel: string | null;
  pickupTime: null;
  dataFreshAt: string;
};

function configuredValue(name: string): string {
  return (process.env[name] || '').trim();
}

export function readSupportMcpConfig(): SupportMcpConfig | null {
  const apiToken = configuredValue('FOXESCONNECT_SUPPORT_MCP_TOKEN');
  const handleSecret = configuredValue('FOXESCONNECT_SUPPORT_MCP_HANDLE_SECRET');
  const tenantId = configuredValue('FOXESCONNECT_SUPPORT_MCP_TENANT_ID');
  const workspaceKey = configuredValue('FOXESCONNECT_SUPPORT_MCP_WORKSPACE_KEY').toLowerCase();
  if (
    apiToken.length < 32 ||
    handleSecret.length < 32 ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(tenantId) ||
    !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(workspaceKey)
  ) {
    return null;
  }
  return { apiToken, handleSecret, tenantId, workspaceKey };
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateSupportMcp(
  request: Request,
): { ok: true; config: SupportMcpConfig } | { ok: false; status: 401 | 503 } {
  const config = readSupportMcpConfig();
  if (!config) return { ok: false, status: 503 };
  const authorization = request.headers.get('authorization') || '';
  const presented = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (!presented || !constantTimeEqual(presented, config.apiToken)) {
    return { ok: false, status: 401 };
  }
  return { ok: true, config };
}

function tenantFilter(tenantId: string): Record<string, unknown> {
  return tenantId === 'default' ? DEFAULT_TENANT_FILTER : { tenantId };
}

async function defaultFindBookingByReference(reference: string, tenantId: string) {
  await dbConnect();
  const booking = await Booking.findOne({ bookingReference: reference, ...tenantFilter(tenantId) })
    .select([
      '_id',
      'tenantId',
      'bookingReference',
      'tour',
      'user',
      'customerPhone',
      'date',
      'dateString',
      'time',
      'status',
      'selectedBookingOption.title',
      'pickupLocation',
      'hotelPickupLocation.name',
      'updatedAt',
    ])
    .populate({ path: 'tour', model: Tour, select: 'title tenantId', match: tenantFilter(tenantId) })
    .populate({ path: 'user', model: User, select: 'email phone', match: { role: 'customer' } })
    .lean();
  return booking as unknown as SupportBookingRecord | null;
}

async function defaultFindBookingById(id: mongoose.Types.ObjectId, tenantId: string) {
  await dbConnect();
  const booking = await Booking.findOne({ _id: id, ...tenantFilter(tenantId) })
    .select([
      '_id',
      'tenantId',
      'bookingReference',
      'tour',
      'date',
      'dateString',
      'time',
      'status',
      'selectedBookingOption.title',
      'pickupLocation',
      'hotelPickupLocation.name',
      'updatedAt',
    ])
    .populate({ path: 'tour', model: Tour, select: 'title tenantId', match: tenantFilter(tenantId) })
    .lean();
  return booking as unknown as SupportBookingRecord | null;
}

function normalizedReference(value: string): string | null {
  const reference = value.trim().toUpperCase();
  return /^EEO-[A-Z0-9-]{8,76}$/.test(reference) ? reference : null;
}

function normalizedProof(type: SupportProofType, value: string): string | null {
  if (type === 'verified_email') {
    const email = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
  }
  const digits = value.trim().replace(/^00/, '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function bookingProof(booking: SupportBookingRecord, type: SupportProofType): string | null {
  if (type === 'verified_email') return normalizedProof(type, booking.user?.email || '');
  return normalizedProof(type, booking.customerPhone || booking.user?.phone || '');
}

function bindingIsValid(binding: SupportBinding, config: SupportMcpConfig): boolean {
  return (
    binding.workspaceKey === config.workspaceKey &&
    /^[a-f0-9]{24}$/i.test(binding.conversationId) &&
    (binding.channel === 'widget' || binding.channel === 'whatsapp')
  );
}

function verificationIdIsValid(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9:_-]{7,159}$/.test(value);
}

function maskReference(reference: string): string {
  const suffix = reference.replace(/[^A-Z0-9]/g, '').slice(-4);
  return `EEO-••••-${suffix || '••••'}`;
}

function handleHash(handle: string): string {
  return createHash('sha256').update(handle).digest('hex');
}

function issueOpaqueHandle(input: {
  config: SupportMcpConfig;
  bookingId: mongoose.Types.ObjectId;
  binding: SupportBinding;
  verificationId: string;
  now: Date;
}): { handle: string; tokenHash: string; expiresAt: Date } {
  const bucketStart = Math.floor(input.now.getTime() / HANDLE_BUCKET_MS) * HANDLE_BUCKET_MS;
  const expiresAt = new Date(bucketStart + HANDLE_TTL_MS);
  const material = [
    'foxesconnect-support-handle-v1',
    input.config.tenantId,
    input.config.workspaceKey,
    input.binding.conversationId.toLowerCase(),
    input.binding.channel,
    input.verificationId,
    String(input.bookingId),
    String(bucketStart),
  ].join('\0');
  const opaque = createHmac('sha256', input.config.handleSecret).update(material).digest('base64url');
  const handle = `eih_${opaque}`;
  return { handle, tokenHash: handleHash(handle), expiresAt };
}

async function defaultPersistHandle(input: {
  tokenHash: string;
  bookingId: mongoose.Types.ObjectId;
  config: SupportMcpConfig;
  binding: SupportBinding;
  expiresAt: Date;
}) {
  await dbConnect();
  await SupportIdentityHandle.updateOne(
    { tokenHash: input.tokenHash },
    {
      $setOnInsert: {
        tokenHash: input.tokenHash,
        booking: input.bookingId,
        tenantId: input.config.tenantId,
        workspaceKey: input.binding.workspaceKey,
        conversationId: input.binding.conversationId.toLowerCase(),
        channel: input.binding.channel,
        allowedTools: ['booking_summary', 'pickup_status'],
        expiresAt: input.expiresAt,
      },
    },
    { upsert: true },
  );
}

async function defaultFindHandle(input: {
  tokenHash: string;
  config: SupportMcpConfig;
  binding: SupportBinding;
  tool: SupportIdentityTool;
  now: Date;
}) {
  await dbConnect();
  const handle = await SupportIdentityHandle.findOne({
    tokenHash: input.tokenHash,
    tenantId: input.config.tenantId,
    workspaceKey: input.binding.workspaceKey,
    conversationId: input.binding.conversationId.toLowerCase(),
    channel: input.binding.channel,
    allowedTools: input.tool,
    expiresAt: { $gt: input.now },
    revokedAt: null,
  })
    .select('_id booking allowedTools expiresAt')
    .lean();
  return handle as unknown as SupportHandleRecord | null;
}

async function defaultTouchHandle(id: mongoose.Types.ObjectId, now: Date) {
  await SupportIdentityHandle.updateOne({ _id: id }, { $set: { lastUsedAt: now } });
}

async function defaultRevokeHandle(
  tokenHash: string,
  config: SupportMcpConfig,
  binding: SupportBinding,
  now: Date,
) {
  await dbConnect();
  const result = await SupportIdentityHandle.updateOne(
    {
      tokenHash,
      tenantId: config.tenantId,
      workspaceKey: binding.workspaceKey,
      conversationId: binding.conversationId.toLowerCase(),
      channel: binding.channel,
      revokedAt: null,
    },
    { $set: { revokedAt: now } },
  );
  return result.modifiedCount === 1;
}

function failedIdentity(): VerifySupportIdentityResult {
  return { verified: false, code: 'IDENTITY_NOT_VERIFIED' };
}

export async function verifySupportBookingIdentity(
  input: {
    reference: string;
    proofType: SupportProofType;
    proofValue: string;
    verificationId: string;
    binding: SupportBinding;
  },
  config: SupportMcpConfig,
  dependencies: SupportMcpDependencies = {},
): Promise<VerifySupportIdentityResult> {
  const reference = normalizedReference(input.reference);
  const proof = normalizedProof(input.proofType, input.proofValue);
  if (
    !reference || !proof || !verificationIdIsValid(input.verificationId) ||
    !bindingIsValid(input.binding, config)
  ) return failedIdentity();

  const now = dependencies.now?.() ?? new Date();
  const limit = dependencies.consumeLimit ?? consumeAbuseLimit;
  const [referenceRate, proofRate, conversationRate] = await Promise.all([
    limit({
      scope: 'support-mcp:reference',
      identity: `${config.workspaceKey}:${reference}`,
      limit: 5,
      windowMs: IDENTITY_WINDOW_MS,
      now,
    }),
    limit({
      scope: 'support-mcp:proof',
      identity: `${config.workspaceKey}:${input.proofType}:${proof}`,
      limit: 8,
      windowMs: IDENTITY_WINDOW_MS,
      now,
    }),
    limit({
      scope: 'support-mcp:conversation',
      identity: `${config.workspaceKey}:${input.binding.channel}:${input.binding.conversationId}`,
      limit: 8,
      windowMs: IDENTITY_WINDOW_MS,
      now,
    }),
  ]);
  if (!referenceRate.allowed || !proofRate.allowed || !conversationRate.allowed) return failedIdentity();

  const findBooking = dependencies.findBookingByReference ?? defaultFindBookingByReference;
  const booking = await findBooking(reference, config.tenantId);
  const expectedProof = booking ? bookingProof(booking, input.proofType) : null;
  if (!booking || !booking.tour?.title || !expectedProof || !constantTimeEqual(expectedProof, proof)) {
    return failedIdentity();
  }

  const issued = issueOpaqueHandle({
    config,
    bookingId: booking._id,
    binding: input.binding,
    verificationId: input.verificationId,
    now,
  });
  await (dependencies.persistHandle ?? defaultPersistHandle)({
    tokenHash: issued.tokenHash,
    bookingId: booking._id,
    config,
    binding: input.binding,
    expiresAt: issued.expiresAt,
  });
  return {
    verified: true,
    handle: issued.handle,
    bookingReferenceMask: maskReference(booking.bookingReference),
    expiresAt: issued.expiresAt.toISOString(),
    allowedTools: ['booking_summary', 'pickup_status'],
  };
}

async function resolveHandleBooking(
  handle: string,
  binding: SupportBinding,
  tool: SupportIdentityTool,
  config: SupportMcpConfig,
  dependencies: SupportMcpDependencies,
): Promise<SupportBookingRecord | null> {
  if (!/^eih_[A-Za-z0-9_-]{43}$/.test(handle) || !bindingIsValid(binding, config)) return null;
  const now = dependencies.now?.() ?? new Date();
  const handleRecord = await (dependencies.findHandle ?? defaultFindHandle)({
    tokenHash: handleHash(handle),
    config,
    binding,
    tool,
    now,
  });
  if (!handleRecord) return null;
  const booking = await (dependencies.findBookingById ?? defaultFindBookingById)(
    handleRecord.booking,
    config.tenantId,
  );
  if (!booking?.tour?.title) return null;
  await (dependencies.touchHandle ?? defaultTouchHandle)(handleRecord._id, now);
  return booking;
}

function supportDate(booking: SupportBookingRecord): string | null {
  if (booking.dateString && /^\d{4}-\d{2}-\d{2}$/.test(booking.dateString)) return booking.dateString;
  if (!booking.date) return null;
  const date = new Date(booking.date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function freshness(now: Date): string {
  return now.toISOString();
}

export async function getBookingSupportSummary(
  input: { handle: string; binding: SupportBinding },
  config: SupportMcpConfig,
  dependencies: SupportMcpDependencies = {},
): Promise<BookingSupportSummary | null> {
  const booking = await resolveHandleBooking(
    input.handle,
    input.binding,
    'booking_summary',
    config,
    dependencies,
  );
  if (!booking) return null;
  return {
    bookingReferenceMask: maskReference(booking.bookingReference),
    status: String(booking.status || 'Unknown'),
    tourTitle: String(booking.tour?.title || ''),
    optionTitle: booking.selectedBookingOption?.title?.trim() || null,
    serviceDate: supportDate(booking),
    serviceTime: booking.time?.trim() || null,
    dataFreshAt: freshness(dependencies.now?.() ?? new Date()),
  };
}

export async function getPickupSupportStatus(
  input: { handle: string; binding: SupportBinding },
  config: SupportMcpConfig,
  dependencies: SupportMcpDependencies = {},
): Promise<PickupSupportStatus | null> {
  const booking = await resolveHandleBooking(
    input.handle,
    input.binding,
    'pickup_status',
    config,
    dependencies,
  );
  if (!booking) return null;
  const label = booking.hotelPickupLocation?.name?.trim() || booking.pickupLocation?.trim() || null;
  return {
    bookingReferenceMask: maskReference(booking.bookingReference),
    pickupStatus: label ? 'confirmed' : 'not_recorded',
    pickupLocationLabel: label,
    // TourTicket has no authoritative pickup-time field. Do not relabel the
    // tour departure time or infer a driver ETA.
    pickupTime: null,
    dataFreshAt: freshness(dependencies.now?.() ?? new Date()),
  };
}

export async function revokeSupportIdentity(
  input: { handle: string; binding: SupportBinding },
  config: SupportMcpConfig,
  dependencies: SupportMcpDependencies = {},
): Promise<{ revoked: boolean }> {
  if (!/^eih_[A-Za-z0-9_-]{43}$/.test(input.handle) || !bindingIsValid(input.binding, config)) {
    return { revoked: false };
  }
  const now = dependencies.now?.() ?? new Date();
  const revoked = await (dependencies.revokeHandle ?? defaultRevokeHandle)(
    handleHash(input.handle),
    config,
    input.binding,
    now,
  );
  return { revoked };
}
