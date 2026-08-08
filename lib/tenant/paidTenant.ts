/**
 * Tenant resolution for the paid-fulfilment path.
 *
 * This storefront is the default brand, but its Stripe webhook is the only
 * endpoint on the account, so it receives payments made on every white-label
 * brand in the shared database. Before 2026-08-07 it resolved the paid tour
 * with the default-tenant filter, failed to find a brand's tour, and refunded
 * the customer instead of booking them.
 *
 * The tenant a payment belongs to is stated by the checkout that created it
 * (`metadata.tenant_id`). Everything downstream — the tour lookup, the booking
 * write, the duplicate check, the confirmation branding — must use that tenant
 * rather than assuming this one.
 *
 * Read-only: this module never writes to the tenants collection.
 */

export const DEFAULT_TENANT_ID = 'default';

export interface PaidTenant {
  tenantId: string;
  isDefault: boolean;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  logo?: string;
  primaryColor?: string;
}

/**
 * The tenant id a payment belongs to. Blank, missing and the literal 'default'
 * all mean this storefront — historic payments predate the metadata entirely.
 */
export function paidTenantId(metadata: Record<string, string> | null | undefined): string {
  const raw = String(metadata?.tenant_id || '').trim();
  return raw || DEFAULT_TENANT_ID;
}

export function isDefaultTenant(tenantId: string): boolean {
  return !tenantId || tenantId === DEFAULT_TENANT_ID;
}

/**
 * Match documents owned by one tenant.
 *
 * The default brand's rows are inconsistent by history — some carry
 * `tenantId: 'default'`, others predate the field entirely — so it keeps the
 * permissive shape. A named brand must match exactly: widening it would let one
 * brand's payment resolve another brand's tour.
 */
export function paidTenantFilter(tenantId: string): Record<string, unknown> {
  if (isDefaultTenant(tenantId)) {
    return {
      $or: [
        { tenantId: DEFAULT_TENANT_ID },
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
      ],
    };
  }
  return { tenantId };
}

/** The value to store on a document created for this tenant. */
export function paidTenantValue(tenantId: string): string {
  return isDefaultTenant(tenantId) ? DEFAULT_TENANT_ID : tenantId;
}

/**
 * Immutable inventory binding written by the checkout that took the payment.
 * The flagship names it `quote_binding`; the white-label network predates that
 * contract and names the same SHA-256 value `checkout_fingerprint`.
 */
export function paidCheckoutReservationKey(
  metadata: Record<string, string> | null | undefined,
  persistedQuoteBinding?: string,
): string {
  return String(
    persistedQuoteBinding
      || metadata?.quote_binding
      || metadata?.checkout_fingerprint
      || '',
  );
}

/**
 * Booking-reference prefix, so a brand's reference is legible as theirs.
 * Mirrors the sibling network's scheme (`DAHA-…` from `dahab-excursions`).
 */
export function paidTenantReferencePrefix(tenantId: string): string {
  if (isDefaultTenant(tenantId)) return 'EEO';
  const cleaned = tenantId.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return cleaned.slice(0, 4) || 'BKG';
}

/**
 * Branding for the confirmation the customer receives. Read straight from the
 * shared tenants collection — a brand's customer must never be emailed under
 * another brand's name.
 *
 * Returns the id alone when there is no tenant record, so fulfilment still
 * proceeds; an unbranded confirmation is recoverable, a lost booking is not.
 */
export async function loadPaidTenant(tenantId: string): Promise<PaidTenant> {
  const resolvedId = paidTenantValue(tenantId);
  const base: PaidTenant = { tenantId: resolvedId, isDefault: isDefaultTenant(resolvedId) };
  if (base.isDefault) return base;

  try {
    // Imported lazily: the pure helpers above are used by callers that must not
    // pull a Mongoose connection (and cannot, under the jsdom test env).
    const { default: mongoose } = await import('mongoose');
    const connection = mongoose.connection;
    if (!connection?.db) return base;
    const doc = await connection.db.collection('tenants').findOne(
      { tenantId: resolvedId },
      { projection: { tenantId: 1, name: 1, contact: 1, 'branding.logo': 1, 'branding.primaryColor': 1 } },
    );
    if (!doc) return base;
    return {
      ...base,
      name: typeof doc.name === 'string' ? doc.name : undefined,
      contactEmail: (doc.contact as { email?: string } | undefined)?.email,
      contactPhone: (doc.contact as { phone?: string } | undefined)?.phone,
      logo: (doc.branding as { logo?: string } | undefined)?.logo,
      primaryColor: (doc.branding as { primaryColor?: string } | undefined)?.primaryColor,
    };
  } catch {
    return base;
  }
}
