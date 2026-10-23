/** Purchased extras are read only from the booking snapshot, never today's tour catalogue. */
export type FeedExtra = {
  id?: string;
  name: string;
  /** Historical billed units; null when an old snapshot does not prove them. */
  quantity: number | null;
  selectedQuantity?: number;
  perGuest?: boolean;
  /** Saved unit rate and its line subtotal, before booking-level discounts, taxes or fees. */
  unitPrice?: string;
  totalPrice?: string;
  currency?: string;
};

export type BookedExtrasSnapshot = {
  selectedAddOns?: unknown;
  selectedAddOnDetails?: unknown;
  addOnQuantityVersion?: unknown;
  currency?: unknown;
};

export type FeedExtrasProjection =
  | { extras?: never; extrasError?: never }
  | { extras: FeedExtra[]; extrasError?: never }
  | { extras?: never; extrasError: 'INVALID_BOOKED_EXTRAS' };

const MAX_EXTRAS = 50;
const MAX_UNITS = 999;
const MAX_MILLI_AMOUNT = 999_999_999_999_999;
const CURRENCY_DECIMALS: Readonly<Record<string, number>> = { JPY: 0, KRW: 0, KWD: 3, BHD: 3, OMR: 3 };

class InvalidBookedExtras extends Error {}
const invalid = (): never => { throw new InvalidBookedExtras(); };
const missing = (value: unknown) => value === undefined || value === null;

function entries(value: unknown): Array<[string, unknown]> {
  if (value instanceof Map) {
    if ([...value.keys()].some((key) => typeof key !== 'string')) return invalid();
    return [...value.entries()];
  }
  // Empty legacy collections still explicitly mean no selections. No non-empty array contract
  // has been established, so an array of ids/names must not be guessed into purchased items.
  if (Array.isArray(value)) return value.length === 0 ? [] : invalid();
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return invalid();
  return Object.entries(value);
}

function detailAt(value: unknown, id: string): Record<string, unknown> {
  let detail: unknown;
  if (value instanceof Map) detail = value.get(id);
  else if (value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, id)) {
    detail = (value as Record<string, unknown>)[id];
  }
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return invalid();
  return detail as Record<string, unknown>;
}

function snapshotText(value: unknown, max: number): string {
  if (typeof value !== 'string') return invalid();
  const clean = [...value].map((char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f ? ' ' : char)
    .join('').replace(/\s+/g, ' ').trim();
  // A purchased name/id is never truncated into a different one.
  return clean && clean.length <= max ? clean : invalid();
}

function units(value: unknown, allowZero = false): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1) && value <= MAX_UNITS
    ? value : invalid();
}

/** Exact thousandths keep line multiplication independent of floating-point rounding. */
function milliAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return invalid();
  const scaled = Math.round(value * 1000);
  if (!Number.isSafeInteger(scaled) || scaled > MAX_MILLI_AMOUNT
    || Math.abs(value - scaled / 1000) > Number.EPSILON * Math.max(1, value) * 8) return invalid();
  return scaled;
}

function priceText(scaled: number, currency: string): string {
  if (!Number.isSafeInteger(scaled) || scaled < 0 || scaled > MAX_MILLI_AMOUNT) return invalid();
  const whole = Math.floor(scaled / 1000);
  const fraction = String(scaled % 1000).padStart(3, '0');
  const digits = Math.max(CURRENCY_DECIMALS[currency] ?? 2, fraction.replace(/0+$/, '').length);
  return digits ? `${whole}.${fraction.slice(0, digits)}` : String(whole);
}

/**
 * Omitted/null snapshots are unknown; an explicitly empty selection is known to have no extras.
 * A damaged selected item is refused individually by the consumer. Its generic marker keeps the
 * page moving without clearing the previous good snapshot or leaking the damaged values.
 */
export function bookedExtrasForFeed(snapshot: BookedExtrasSnapshot): FeedExtrasProjection {
  try {
    if (missing(snapshot.selectedAddOns)) {
      if (!missing(snapshot.selectedAddOnDetails) && entries(snapshot.selectedAddOnDetails).length) return invalid();
      return {};
    }
    const selected = entries(snapshot.selectedAddOns);
    if (selected.length > MAX_EXTRAS) return invalid();
    selected.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const extras: FeedExtra[] = [];
    for (const [key, rawQuantity] of selected) {
      const selectedQuantity = units(rawQuantity, true);
      if (selectedQuantity === 0) continue;
      const id = snapshotText(key, 80);
      const detail = detailAt(snapshot.selectedAddOnDetails, key);
      const name = snapshotText(detail.title, 200);
      const perGuest = missing(detail.perGuest) ? undefined
        : typeof detail.perGuest === 'boolean' ? detail.perGuest : invalid();
      // Since September, the detail records billed units. Older per-person selections can be
      // boolean toggles; neither that count nor today's mutable guest count proves billed units.
      const quantity = !missing(detail.quantity) ? units(detail.quantity)
        : perGuest === false || snapshot.addOnQuantityVersion === 1 ? selectedQuantity : null;
      const extra: FeedExtra = { id, name, quantity, selectedQuantity, ...(perGuest === undefined ? {} : { perGuest }) };
      if (!missing(detail.price)) {
        const currency = typeof snapshot.currency === 'string' ? snapshot.currency.trim().toUpperCase() : '';
        if (!/^[A-Z]{3}$/.test(currency)) return invalid();
        const price = milliAmount(detail.price);
        extra.unitPrice = priceText(price, currency);
        extra.currency = currency;
        if (quantity !== null) extra.totalPrice = priceText(price * quantity, currency);
      }
      extras.push(extra);
    }
    return { extras };
  } catch (error) {
    if (!(error instanceof InvalidBookedExtras)) throw error;
    return { extrasError: 'INVALID_BOOKED_EXTRAS' };
  }
}
