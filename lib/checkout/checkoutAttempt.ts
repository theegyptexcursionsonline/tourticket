export const CHECKOUT_ATTEMPT_STORAGE_KEY = 'tourticket.checkout-attempt-id';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CheckoutAttemptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type CheckoutAttemptIdFactory = () => string;

let volatileCheckoutAttemptId: string | null = null;

export function normalizeCheckoutAttemptId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return UUID_V4_PATTERN.test(normalized) ? normalized : null;
}

function browserSessionStorage(): CheckoutAttemptStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function secureUuidV4(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Secure checkout identifiers are not supported by this browser.');
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateCheckoutAttemptId(
  storage: CheckoutAttemptStorage | null = browserSessionStorage(),
  createId: CheckoutAttemptIdFactory = secureUuidV4,
): string {
  try {
    const persisted = normalizeCheckoutAttemptId(storage?.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY));
    if (persisted) {
      volatileCheckoutAttemptId = persisted;
      return persisted;
    }
  } catch {
    // A privacy-restricted browser may deny storage access. The in-memory
    // fallback still keeps the attempt stable while this page is mounted.
  }

  const existing = normalizeCheckoutAttemptId(volatileCheckoutAttemptId);
  if (existing) {
    try {
      storage?.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, existing);
    } catch {
      // Keep the secure in-memory identifier when storage is unavailable.
    }
    return existing;
  }

  const created = normalizeCheckoutAttemptId(createId());
  if (!created) throw new Error('Unable to create a valid checkout attempt identifier.');
  volatileCheckoutAttemptId = created;
  try {
    storage?.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, created);
  } catch {
    // Keep the secure in-memory identifier when storage is unavailable.
  }
  return created;
}

export function completeCheckoutAttempt(
  storage: CheckoutAttemptStorage | null = browserSessionStorage(),
): void {
  volatileCheckoutAttemptId = null;
  try {
    storage?.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // The completed attempt is cleared from memory even if storage is blocked.
  }
}

export function buildCheckoutPaymentIdempotencyKey(quoteBinding: string): string {
  const normalized = String(quoteBinding || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error('A valid checkout quote binding is required.');
  }
  // Inline and modal are two presentations of the same Payment Element
  // lifecycle. Keep their Stripe request identity stable while separating it
  // from the legacy key shape and from hosted Checkout Sessions.
  return `tourticket-payment-element-${normalized}`;
}
