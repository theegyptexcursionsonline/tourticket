import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('admin routes on main domain redirect to dashboard subdomain', async ({ request }) => {
    const response = await request.get('/admin', { maxRedirects: 0 });
    // Should redirect (307) to dashboard.egypt-excursionsonline.com
    expect(response.status()).toBe(307);
    const location = response.headers()['location'];
    expect(location).toContain('dashboard.egypt-excursionsonline.com');
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
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
