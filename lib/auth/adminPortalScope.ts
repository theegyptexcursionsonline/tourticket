export const ADMIN_PORTAL_SCOPES = ['main', 'multiTenant'] as const;

export type AdminPortalScope = (typeof ADMIN_PORTAL_SCOPES)[number];

export function serializeAdminPortalScopes(value: unknown): AdminPortalScope[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (scope): scope is AdminPortalScope =>
          typeof scope === 'string'
          && ADMIN_PORTAL_SCOPES.includes(scope as AdminPortalScope),
      ),
    ),
  );
}

export function canAccessMainAdminPortal(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  // An absent/empty value keeps existing administrators working until their
  // account is explicitly migrated to portal scopes.
  if (value.length === 0) {
    return true;
  }

  return serializeAdminPortalScopes(value).includes('main');
}
