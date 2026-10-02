export const MAIN_DISCOUNT_TENANT = 'default';

export function discountTenantFilter(tenantId = MAIN_DISCOUNT_TENANT) {
  if (typeof tenantId !== 'string' || !tenantId.trim() || tenantId !== tenantId.trim() || tenantId === 'all') {
    throw new Error('An exact discount tenant is required.');
  }
  return tenantId === MAIN_DISCOUNT_TENANT
    ? { $or: [{ tenantId: MAIN_DISCOUNT_TENANT }, { tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }] }
    : { tenantId };
}
