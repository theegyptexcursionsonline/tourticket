import { DEFAULT_TENANT_FILTER } from './defaultTenantFilter';

// The content engine sends tenantId 'default' for the flagship site; legacy
// docs carry no tenantId at all. Both mean "the default EEO site".
export const DEFAULT_TENANT_ID = 'default';

export function normalizeTenantId(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  return trimmed || undefined;
}

export function isDefaultTenant(input: unknown): boolean {
  const id = normalizeTenantId(input);
  return !id || id === DEFAULT_TENANT_ID;
}

// tenantId to persist on a document: default-site content stores none, so new
// writes stay shape-compatible with existing docs (and DEFAULT_TENANT_FILTER).
export function storedTenantId(input: unknown): string | undefined {
  return isDefaultTenant(input) ? undefined : normalizeTenantId(input);
}

// Filter fragment selecting a single tenant's docs; the default site owns
// every doc without a tenantId. Spread into queries that need extra criteria
// (note DEFAULT_TENANT_FILTER uses $or, so don't combine with another $or).
export function tenantFilter(tenantId?: unknown): Record<string, unknown> {
  return isDefaultTenant(tenantId)
    ? { ...DEFAULT_TENANT_FILTER }
    : { tenantId: normalizeTenantId(tenantId) };
}

// Scopes a slug lookup to a single tenant's namespace: the same slug may exist
// once per tenant.
export function tenantSlugFilter(slug: string, tenantId?: unknown): Record<string, unknown> {
  return { slug, ...tenantFilter(tenantId) };
}
