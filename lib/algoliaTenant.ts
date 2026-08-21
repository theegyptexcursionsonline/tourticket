const TENANT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62})$/i;

/**
 * Build the mandatory Algolia ownership predicate for the active storefront.
 * Tenant IDs come from server-owned routing, but validation still fails closed
 * so a malformed mapping can never weaken or rewrite the filter expression.
 */
export function buildAlgoliaTenantFilter(tenantId: string): string {
  const normalized = tenantId.trim();
  if (!TENANT_ID_PATTERN.test(normalized)) {
    throw new Error('Invalid storefront tenant identifier');
  }

  const value = JSON.stringify(normalized);
  return `(tenantId:${value} OR tenantIds:${value})`;
}
