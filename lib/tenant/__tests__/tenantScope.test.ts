import {
  isDefaultTenant,
  normalizeTenantId,
  storedTenantId,
  tenantFilter,
  tenantSlugFilter,
} from '../tenantScope';
import { DEFAULT_TENANT_FILTER } from '../defaultTenantFilter';

describe('tenantScope', () => {
  it('normalizes tenant ids', () => {
    expect(normalizeTenantId('  makadi-bay  ')).toBe('makadi-bay');
    expect(normalizeTenantId('')).toBeUndefined();
    expect(normalizeTenantId('   ')).toBeUndefined();
    expect(normalizeTenantId(undefined)).toBeUndefined();
    expect(normalizeTenantId(null)).toBeUndefined();
    expect(normalizeTenantId(42)).toBeUndefined();
  });

  it('treats missing, empty, and "default" as the default tenant', () => {
    expect(isDefaultTenant(undefined)).toBe(true);
    expect(isDefaultTenant(null)).toBe(true);
    expect(isDefaultTenant('')).toBe(true);
    expect(isDefaultTenant('default')).toBe(true);
    expect(isDefaultTenant('makadi-bay')).toBe(false);
  });

  it('stores no tenantId for default-site content (backward compatible with legacy docs)', () => {
    expect(storedTenantId(undefined)).toBeUndefined();
    expect(storedTenantId('default')).toBeUndefined();
    expect(storedTenantId('')).toBeUndefined();
    expect(storedTenantId('el-gouna')).toBe('el-gouna');
    expect(storedTenantId('  el-gouna ')).toBe('el-gouna');
  });

  it('builds a spreadable per-tenant filter fragment', () => {
    expect(tenantFilter()).toEqual({ ...DEFAULT_TENANT_FILTER });
    expect(tenantFilter('default')).toEqual({ ...DEFAULT_TENANT_FILTER });
    expect(tenantFilter('makadi-bay')).toEqual({ tenantId: 'makadi-bay' });
    expect({ name: 'Makadi Bay', ...tenantFilter('makadi-bay') }).toEqual({
      name: 'Makadi Bay',
      tenantId: 'makadi-bay',
    });
  });

  it('scopes default-site slug lookups to docs with no/blank/default tenantId', () => {
    expect(tenantSlugFilter('red-sea-guide')).toEqual({
      slug: 'red-sea-guide',
      ...DEFAULT_TENANT_FILTER,
    });
    expect(tenantSlugFilter('red-sea-guide', 'default')).toEqual({
      slug: 'red-sea-guide',
      ...DEFAULT_TENANT_FILTER,
    });
  });

  it('scopes tenant slug lookups to that tenant only', () => {
    expect(tenantSlugFilter('red-sea-guide', 'hurghada-excursions-online')).toEqual({
      slug: 'red-sea-guide',
      tenantId: 'hurghada-excursions-online',
    });
  });

  it('lets the same slug live under different tenants without matching each other', () => {
    const docs = [
      { slug: 'red-sea-guide' }, // legacy default-site doc, no tenantId
      { slug: 'red-sea-guide', tenantId: 'makadi-bay' },
    ];

    // Simulate the Mongo match locally: default filter must hit only the legacy
    // doc, tenant filter only the tenant doc.
    const matches = (filter: Record<string, unknown>) =>
      docs.filter((d) => {
        if (d.slug !== filter.slug) return false;
        if ('tenantId' in filter) return d.tenantId === filter.tenantId;
        // DEFAULT_TENANT_FILTER shape: missing/null/''/'default'
        return !d.tenantId || d.tenantId === 'default';
      });

    expect(matches(tenantSlugFilter('red-sea-guide'))).toEqual([{ slug: 'red-sea-guide' }]);
    expect(matches(tenantSlugFilter('red-sea-guide', 'makadi-bay'))).toEqual([
      { slug: 'red-sea-guide', tenantId: 'makadi-bay' },
    ]);
    expect(matches(tenantSlugFilter('red-sea-guide', 'el-gouna'))).toEqual([]);
  });
});
