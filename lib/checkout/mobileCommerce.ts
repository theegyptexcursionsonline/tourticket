import { createHash } from 'node:crypto';
import { checkoutItemSubtotal } from '@/lib/checkout/cartTotals';
import { normalizeCheckoutAttemptId } from '@/lib/checkout/checkoutAttempt';
import {
  createInventoryHolds,
  inspectInventoryAvailability,
  releaseInventoryHolds,
  type InventoryAvailabilitySnapshot,
} from '@/lib/checkout/inventoryHolds';
import {
  secureCartPricing,
  type SecureAddOnDetail,
  type SecureCartItem,
} from '@/lib/checkout/serverCartPricing';
import { signToken, verifyToken } from '@/lib/jwt';
import { STANDARD_OPTION_KEY } from '@/lib/revenue/pricingResolver';

export const MOBILE_COMMERCE_CONTRACT = 'eeo.mobile-commerce.v1' as const;
const TENANT_ID = 'default' as const;
const QUOTE_TTL_SECONDS = 5 * 60;

export class MobileCommerceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MobileCommerceError';
  }
}

export type MobileCommerceTarget = {
  contractVersion: typeof MOBILE_COMMERCE_CONTRACT;
  tenantId: typeof TENANT_ID;
  tourId: string;
  pricingKey: string;
  date: string;
  time: string;
  guests: { adults: number; children: number; infants: number };
  addOns: Array<{ id: string; quantity: number }>;
};

export type MobileCommerceQuote = {
  contractVersion: typeof MOBILE_COMMERCE_CONTRACT;
  tenantId: typeof TENANT_ID;
  target: Omit<MobileCommerceTarget, 'contractVersion' | 'tenantId' | 'addOns'> & {
    addOns: MobileCommerceTarget['addOns'];
  };
  pricing: {
    currency: 'USD';
    source: 'catalogue' | 'override';
    prices: { adult: number; child: number; infant: number };
    subtotal: number;
    overrideVersion: number;
    catalogueVersion: string;
    executionId: string | null;
    overrideId: string | null;
  };
  authoredAddOns: SecureAddOnDetail[];
  availability: InventoryAvailabilitySnapshot;
  quoteVersion: string;
};

type MobileQuoteCapability = {
  scope: 'mobile-commerce:hold';
  contractVersion: typeof MOBILE_COMMERCE_CONTRACT;
  tenantId: typeof TENANT_ID;
  targetBinding: string;
  quoteVersion: string;
};

type MobileHoldCapability = {
  scope: 'mobile-commerce:release';
  contractVersion: typeof MOBILE_COMMERCE_CONTRACT;
  tenantId: typeof TENANT_ID;
  reservationKey: string;
  targetBinding: string;
  quoteVersion: string;
};

function integer(value: unknown, minimum: number, maximum: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeAddOns(value: unknown): MobileCommerceTarget['addOns'] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new MobileCommerceError(400, 'INVALID_ADD_ONS', 'Add-ons must be a list of at most 20 authored selections.');
  }
  const seen = new Set<string>();
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw new MobileCommerceError(400, 'INVALID_ADD_ONS', 'Each add-on selection must include an id and quantity.');
    }
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const quantity = integer(record.quantity, 1, 50);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) || quantity === null || seen.has(id)) {
      throw new MobileCommerceError(400, 'INVALID_ADD_ONS', 'Add-on selections must have unique stable ids and valid quantities.');
    }
    seen.add(id);
    return { id, quantity };
  }).sort((left, right) => left.id.localeCompare(right.id));
}

export function normalizeMobileCommerceTarget(value: unknown): MobileCommerceTarget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MobileCommerceError(400, 'INVALID_REQUEST', 'A mobile commerce request object is required.');
  }
  const input = value as Record<string, unknown>;
  if (input.contractVersion !== MOBILE_COMMERCE_CONTRACT) {
    throw new MobileCommerceError(409, 'CONTRACT_VERSION_UNSUPPORTED', `Use ${MOBILE_COMMERCE_CONTRACT}.`);
  }
  if (input.tenantId !== TENANT_ID) {
    throw new MobileCommerceError(403, 'TENANT_FORBIDDEN', 'This commerce contract is scoped to the main EEO tenant.');
  }
  const tourId = typeof input.tourId === 'string' ? input.tourId.trim().toLowerCase() : '';
  const pricingKey = typeof input.pricingKey === 'string' ? input.pricingKey.trim() : '';
  const date = typeof input.date === 'string' ? input.date.trim() : '';
  const time = typeof input.time === 'string' ? input.time.trim() : '';
  const guests = input.guests && typeof input.guests === 'object' && !Array.isArray(input.guests)
    ? input.guests as Record<string, unknown>
    : {};
  const adults = integer(guests.adults, 1, 50);
  const children = integer(guests.children ?? 0, 0, 50);
  const infants = integer(guests.infants ?? 0, 0, 50);
  const guestTotal = Number(adults) + Number(children) + Number(infants);
  if (!/^[a-f0-9]{24}$/.test(tourId)
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(pricingKey)
    || !validCalendarDate(date)
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    || adults === null
    || children === null
    || infants === null
    || guestTotal < 1
    || guestTotal > 50) {
    throw new MobileCommerceError(
      400,
      'INVALID_TARGET',
      'Select a valid tour, stable pricing key, departure, and guest count.',
    );
  }
  return {
    contractVersion: MOBILE_COMMERCE_CONTRACT,
    tenantId: TENANT_ID,
    tourId,
    pricingKey,
    date,
    time,
    guests: { adults, children, infants },
    addOns: normalizeAddOns(input.addOns),
  };
}

function pricingInput(target: MobileCommerceTarget) {
  return {
    id: target.tourId,
    selectedDate: target.date,
    selectedTime: target.time,
    quantity: target.guests.adults,
    childQuantity: target.guests.children,
    infantQuantity: target.guests.infants,
    selectedBookingOption: target.pricingKey === STANDARD_OPTION_KEY
      ? { id: 'standard-default', pricingKey: STANDARD_OPTION_KEY }
      : { pricingKey: target.pricingKey },
    selectedAddOns: Object.fromEntries(target.addOns.map((addOn) => [addOn.id, addOn.quantity])),
  };
}

function targetBinding(target: MobileCommerceTarget): string {
  return createHash('sha256').update(JSON.stringify({
    contractVersion: target.contractVersion,
    tenantId: target.tenantId,
    tourId: target.tourId,
    pricingKey: target.pricingKey,
    date: target.date,
    time: target.time,
    guests: target.guests,
    addOns: target.addOns,
  })).digest('hex');
}

function quoteVersion(item: SecureCartItem, target: MobileCommerceTarget): string {
  const authoredAddOns = [...item.availableAddOns]
    .map((addOn) => ({ ...addOn }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const selectedAddOns = Object.entries(item.selectedAddOns)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, quantity]) => ({ id, quantity, detail: item.selectedAddOnDetails[id] }));
  return `mqv1_${createHash('sha256').update(JSON.stringify({
    target,
    pricingKey: item.selectedBookingOption.pricingKey,
    prices: item.guestPrices,
    overrideVersion: item.priceVersion,
    catalogueVersion: item.priceSourceVersion,
    source: item.priceSource,
    executionId: item.priceExecutionId,
    overrideId: item.priceOverrideId,
    authoredAddOns,
    selectedAddOns,
  })).digest('hex')}`;
}

async function buildMobileCommerceQuote(target: MobileCommerceTarget): Promise<{
  quote: MobileCommerceQuote;
  item: SecureCartItem;
}> {
  let item: SecureCartItem;
  try {
    [item] = await secureCartPricing([pricingInput(target)], { allowUnversionedQuote: true });
  } catch (error: unknown) {
    if (error instanceof MobileCommerceError) throw error;
    throw new MobileCommerceError(
      422,
      'QUOTE_UNAVAILABLE',
      error instanceof Error ? error.message : 'The selected tour or option cannot be quoted.',
    );
  }
  if (!item.priceSourceVersion || item.selectedBookingOption.pricingKey !== target.pricingKey) {
    throw new MobileCommerceError(422, 'QUOTE_UNAVAILABLE', 'The selected pricing option is not safely versioned.');
  }
  const availability = await inspectInventoryAvailability(item);
  const version = quoteVersion(item, target);
  return {
    item,
    quote: {
      contractVersion: MOBILE_COMMERCE_CONTRACT,
      tenantId: TENANT_ID,
      target: {
        tourId: target.tourId,
        pricingKey: target.pricingKey,
        date: target.date,
        time: target.time,
        guests: target.guests,
        addOns: target.addOns,
      },
      pricing: {
        currency: 'USD',
        source: item.priceSource,
        prices: item.guestPrices,
        subtotal: checkoutItemSubtotal(item),
        overrideVersion: item.priceVersion,
        catalogueVersion: item.priceSourceVersion,
        executionId: item.priceExecutionId,
        overrideId: item.priceOverrideId,
      },
      authoredAddOns: item.availableAddOns,
      availability,
      quoteVersion: version,
    },
  };
}

function normalizeCapability(value: unknown, code: string): string {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!token || token.length > 8_192) {
    throw new MobileCommerceError(401, code, 'A valid short-lived commerce capability is required.');
  }
  return token;
}

async function verifyCapability<T extends MobileQuoteCapability | MobileHoldCapability>(
  token: string,
  expectedScope: T['scope'],
): Promise<T> {
  const payload = await verifyToken(token);
  if (!payload
    || payload.scope !== expectedScope
    || payload.contractVersion !== MOBILE_COMMERCE_CONTRACT
    || payload.tenantId !== TENANT_ID) {
    throw new MobileCommerceError(401, 'CAPABILITY_INVALID', 'The commerce capability is invalid or expired.');
  }
  return payload as unknown as T;
}

export async function createMobileCommerceQuote(value: unknown) {
  const target = normalizeMobileCommerceTarget(value);
  const { quote } = await buildMobileCommerceQuote(target);
  const quoteToken = await signToken({
    sub: `mobile-commerce:quote:${target.tourId}`,
    scope: 'mobile-commerce:hold',
    contractVersion: MOBILE_COMMERCE_CONTRACT,
    tenantId: TENANT_ID,
    targetBinding: targetBinding(target),
    quoteVersion: quote.quoteVersion,
  }, { expiresIn: `${QUOTE_TTL_SECONDS}s` });
  return {
    quote,
    quoteToken,
    quoteExpiresAt: new Date(Date.now() + QUOTE_TTL_SECONDS * 1_000).toISOString(),
  };
}

export async function getMobileCommerceAvailability(value: unknown) {
  const target = normalizeMobileCommerceTarget(value);
  const { quote } = await buildMobileCommerceQuote(target);
  return {
    contractVersion: MOBILE_COMMERCE_CONTRACT,
    tenantId: TENANT_ID,
    target: quote.target,
    availability: quote.availability,
    quoteVersion: quote.quoteVersion,
  };
}

export async function createMobileCommerceHold(value: unknown) {
  const target = normalizeMobileCommerceTarget(value);
  const input = value as Record<string, unknown>;
  const idempotencyKey = normalizeCheckoutAttemptId(input.idempotencyKey);
  if (!idempotencyKey) {
    throw new MobileCommerceError(400, 'INVALID_IDEMPOTENCY_KEY', 'A stable UUID v4 idempotency key is required.');
  }
  const quoteToken = normalizeCapability(input.quoteToken, 'QUOTE_CAPABILITY_REQUIRED');
  const capability = await verifyCapability<MobileQuoteCapability>(quoteToken, 'mobile-commerce:hold');
  const binding = targetBinding(target);
  if (capability.targetBinding !== binding) {
    throw new MobileCommerceError(403, 'CAPABILITY_TARGET_MISMATCH', 'The quote capability does not match this checkout target.');
  }

  const { quote, item } = await buildMobileCommerceQuote(target);
  const requestedQuoteVersion = typeof input.quoteVersion === 'string' ? input.quoteVersion : '';
  if (!requestedQuoteVersion
    || capability.quoteVersion !== requestedQuoteVersion
    || quote.quoteVersion !== requestedQuoteVersion) {
    throw new MobileCommerceError(409, 'PRICE_CHANGED', 'The quote changed. Request a fresh quote before holding inventory.', {
      currentQuoteVersion: quote.quoteVersion,
    });
  }

  const reservationKey = createHash('sha256')
    .update(`${MOBILE_COMMERCE_CONTRACT}\0${TENANT_ID}\0${idempotencyKey}`)
    .digest('hex');
  const holds = await createInventoryHolds({ reservationKey, cart: [item] });
  const hold = holds[0] as unknown as { state?: string; expiresAt?: Date | string } | undefined;
  const expiresAt = hold?.expiresAt ? new Date(hold.expiresAt) : new Date(Number.NaN);
  if (hold?.state !== 'active' || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new MobileCommerceError(503, 'HOLD_UNAVAILABLE', 'Inventory could not be held safely.');
  }
  const ttlSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1_000));
  const holdToken = await signToken({
    sub: `mobile-commerce:hold:${target.tourId}`,
    scope: 'mobile-commerce:release',
    contractVersion: MOBILE_COMMERCE_CONTRACT,
    tenantId: TENANT_ID,
    reservationKey,
    targetBinding: binding,
    quoteVersion: quote.quoteVersion,
  }, { expiresIn: `${ttlSeconds}s` });
  return {
    contractVersion: MOBILE_COMMERCE_CONTRACT,
    tenantId: TENANT_ID,
    status: 'active' as const,
    expiresAt: expiresAt.toISOString(),
    quote,
    holdToken,
  };
}

export async function releaseMobileCommerceHold(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MobileCommerceError(400, 'INVALID_REQUEST', 'A release request object is required.');
  }
  const input = value as Record<string, unknown>;
  if (input.contractVersion !== MOBILE_COMMERCE_CONTRACT || input.tenantId !== TENANT_ID) {
    throw new MobileCommerceError(403, 'RELEASE_SCOPE_INVALID', 'The release request is outside this contract scope.');
  }
  const token = normalizeCapability(input.holdToken, 'HOLD_CAPABILITY_REQUIRED');
  const capability = await verifyCapability<MobileHoldCapability>(token, 'mobile-commerce:release');
  if (!/^[a-f0-9]{64}$/.test(String(capability.reservationKey || ''))
    || !/^mqv1_[a-f0-9]{64}$/.test(String(capability.quoteVersion || ''))
    || !/^[a-f0-9]{64}$/.test(String(capability.targetBinding || ''))) {
    throw new MobileCommerceError(401, 'CAPABILITY_INVALID', 'The hold capability is malformed.');
  }
  const releasedCount = await releaseInventoryHolds({
    reservationKey: capability.reservationKey,
    reason: 'mobile_capability_release',
  });
  return {
    contractVersion: MOBILE_COMMERCE_CONTRACT,
    tenantId: TENANT_ID,
    status: 'released' as const,
    released: releasedCount > 0,
    alreadyInactive: releasedCount === 0,
  };
}
