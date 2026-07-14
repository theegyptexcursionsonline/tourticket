import {
  canAccessMainAdminPortal,
  serializeAdminPortalScopes,
} from '../adminPortalScope';

describe('main admin portal scope', () => {
  it('allows legacy accounts until they are explicitly scoped', () => {
    expect(canAccessMainAdminPortal(undefined)).toBe(true);
    expect(canAccessMainAdminPortal([])).toBe(true);
  });

  it('allows main-scoped accounts and rejects multi-tenant-only accounts', () => {
    expect(canAccessMainAdminPortal(['main'])).toBe(true);
    expect(canAccessMainAdminPortal(['multiTenant'])).toBe(false);
  });

  it('normalizes valid scopes and rejects malformed explicit scope data', () => {
    expect(serializeAdminPortalScopes(['main', 'main', 'invalid'])).toEqual(['main']);
    expect(canAccessMainAdminPortal(['invalid'])).toBe(false);
    expect(canAccessMainAdminPortal('main')).toBe(false);
  });
});
