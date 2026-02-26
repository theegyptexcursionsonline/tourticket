import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test('GET /api/tours/public returns JSON', async ({ request }) => {
    const response = await request.get('/api/tours/public');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('GET /api/destinations returns JSON', async ({ request }) => {
    const response = await request.get('/api/destinations');
    expect(response.ok()).toBeTruthy();
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('GET /api/admin/bookings without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/admin/bookings');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('PATCH /api/admin/bookings/:id without auth returns 401', async ({ request }) => {
    const response = await request.patch('/api/admin/bookings/000000000000000000000000', {
      data: { status: 'Confirmed' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
