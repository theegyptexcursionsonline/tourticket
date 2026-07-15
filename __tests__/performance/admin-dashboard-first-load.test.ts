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
});
