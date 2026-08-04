import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_PERMISSIONS, ROLE_PERMISSION_MAP } from '@/lib/constants/adminPermissions';

function adminMutationRouteFiles(): string[] {
  const root = path.join(process.cwd(), 'app/api/admin');
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
    return /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/.test(source);
  });
}

describe('every admin mutation is auditable', () => {
  // The session audit hook lives inside requireAdminAuth; verifyAdmin delegates
  // into it. Session logins/2FA record via recordAdminLogin. Non-session
  // surfaces authenticate their own way — the content-engine bridge by Bearer
  // token, accept-invitation by the invitation token. A mutation route with
  // NONE of these is both unauthenticated and invisible to Audit: the exact
  // regression this guard catches. New auth mechanisms get added here
  // deliberately, never by silently dropping a route.
  const RECOGNIZED_AUTH = [
    'requireAdminAuth',      // session admin actions → audited
    'verifyAdmin',           // delegates to requireAdminAuth → audited
    'recordAdminLogin',      // login / 2FA session establishment
    'verifyContentEngine',   // content-engine Bearer bridge
    'invitationToken',       // accept-invitation self-auth
  ];
  it('authenticates and (for session actions) audits every admin mutation route', () => {
    const offenders = adminMutationRouteFiles().filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return !RECOGNIZED_AUTH.some((marker) => source.includes(marker));
    });
    expect(offenders.map((file) => path.relative(process.cwd(), file))).toEqual([]);
  });

  it('records the mutation on both auth branches', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'lib/auth/adminAuth.ts'), 'utf8');
    expect(source.match(/recordAdminMutation\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
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
