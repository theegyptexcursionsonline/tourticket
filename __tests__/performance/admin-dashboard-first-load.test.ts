import fs from 'node:fs';
import path from 'node:path';

describe('admin dashboard first-load contract', () => {
  it('uses one dashboard data request and does not block on the reports endpoint', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/admin/AdminDashboardClient.tsx'),
      'utf8',
    );

    expect(source).toContain("fetchWithTimeout('/api/admin/dashboard'");
    expect(source).not.toContain("fetchWithTimeout('/api/admin/reports'");
  });

  it('does not initialize storefront Firebase authentication in the admin shell', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/admin/AdminClientLayout.tsx'),
      'utf8',
    );

    expect(source).not.toContain("@/contexts/AuthContext");
    expect(source).not.toContain('<AuthProvider>');
  });

  it('does not waste first-load bandwidth prefetching full-page sidebar navigations', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components/admin/Sidebar.tsx'),
      'utf8',
    );

    expect(source).toContain('window.location.assign(href)');
    expect(source).toContain('prefetch={false}');
  });
});
