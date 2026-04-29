export const DEFAULT_TENANT_FILTER = {
  $or: [
    { tenantId: 'default' },
    { tenantId: { $exists: false } },
    { tenantId: null },
    { tenantId: '' },
  ],
};
