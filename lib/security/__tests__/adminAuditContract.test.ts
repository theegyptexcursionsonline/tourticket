import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_PERMISSIONS, ROLE_PERMISSION_MAP } from '@/lib/constants/adminPermissions';

function adminMutationRouteFiles(): string[] {
  const root = path.join(process.cwd(), 'app/api');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'route.ts' || entry.name === 'route.tsx') files.push(full);
    }
  };
  walk(root);
  return files.filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    const isAdminSurface = file.startsWith(path.join(root, 'admin'))
      || /requireAdminAuth|verifyAdmin|verifyContentEngine/.test(source);
    return isAdminSurface
      && /(?:export\s+(?:async\s+)?function|export\s+const)\s+(POST|PUT|PATCH|DELETE)\b/.test(source);
  });
}

describe('every admin mutation is auditable', () => {
  // Every mutation needs both authentication and a response-aware audit path.
  // Login/2FA record the established session explicitly; all other mutations
  // use withAdminAudit so the final status is success, rejection, or failure.
  const RECOGNIZED_AUTH = [
    'requireAdminAuth',      // session admin actions → audited
    'verifyAdmin',           // delegates to requireAdminAuth → audited
    'recordAdminLogin',      // login / 2FA session establishment
    'verifyContentEngine',   // content-engine Bearer bridge
    'invitationToken',       // accept-invitation self-auth
  ];
  it('authenticates every admin mutation route', () => {
    const offenders = adminMutationRouteFiles().filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return !RECOGNIZED_AUTH.some((marker) => source.includes(marker));
    });
    expect(offenders.map((file) => path.relative(process.cwd(), file))).toEqual([]);
  });

  it('records a final outcome for every admin mutation route', () => {
    const offenders = adminMutationRouteFiles().filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return !source.includes('withAdminAudit') && !source.includes('recordAdminLogin');
    });
    expect(offenders.map((file) => path.relative(process.cwd(), file))).toEqual([]);
  });

  it('registers the actor on both session auth branches instead of writing before the handler', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/auth/adminAuth.ts'), 'utf8');
    expect(source.match(/registerAdminAuditActor\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('await recordAdminMutation(request');
  });

  it('registers auditable actors for non-session mutation principals', () => {
    const contentAuth = fs.readFileSync(path.join(process.cwd(), 'lib/auth/verifyContentEngine.ts'), 'utf8');
    const invitationRoute = fs.readFileSync(path.join(process.cwd(), 'app/api/admin/accept-invitation/route.ts'), 'utf8');
    expect(contentAuth).toContain('registerAdminAuditActor');
    expect(invitationRoute).toContain('registerAdminAuditActor');
  });
});

describe('admin audit permission contract', () => {
  it('is grantable through Team Access and included for full administrators', () => {
    expect(ADMIN_PERMISSIONS).toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.admin).toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.super_admin).toContain('manageAudit');
  });

  it('does not grant audit visibility to limited roles by default', () => {
    expect(ROLE_PERMISSION_MAP.operations).not.toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.content).not.toContain('manageAudit');
    expect(ROLE_PERMISSION_MAP.support).not.toContain('manageAudit');
  });
});
