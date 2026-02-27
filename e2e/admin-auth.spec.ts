import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('admin routes on main domain redirect to dashboard subdomain', async ({ request }) => {
    const response = await request.get('/admin', { maxRedirects: 0 });
    // Should redirect (307) to dashboard2.egypt-excursionsonline.com
    expect(response.status()).toBe(307);
    const location = response.headers()['location'];
    expect(location).toContain('dashboard2.egypt-excursionsonline.com');
  });

  test('admin API without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/admin/bookings');
    expect(response.status()).toBe(401);
  });

  test('admin login API rejects empty credentials', async ({ request }) => {
    const response = await request.post('/api/admin/login', {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('admin login API rejects invalid credentials', async ({ request }) => {
    const response = await request.post('/api/admin/login', {
      data: { email: 'wrong@test.com', password: 'wrongpassword' },
    });
    // Should return 401 or 500 (if DB unreachable)
    expect(response.ok()).toBeFalsy();
    const body = await response.json().catch(() => ({}));
    expect(body.success).not.toBe(true);
  });
});
