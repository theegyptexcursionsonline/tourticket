/**
 * Supertest API Integration Tests
 *
 * These tests require a running server (dev or production).
 * They validate HTTP-level behavior: status codes, headers, response shapes.
 *
 * Deliberately excluded from `pnpm test` / `pnpm test:unit` — a cold checkout has
 * no server, and failing there would say nothing about the code. Run explicitly:
 *
 *   pnpm dev            # or point TEST_BASE_URL at an already-running deploy
 *   pnpm test:api
 *
 * CI runs it against `pnpm start` (see .github/workflows). When the server is
 * unreachable this suite FAILS rather than skipping — a green `pnpm test:api`
 * has to mean the endpoints were really exercised.
 */
import supertest from 'supertest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  request = supertest(BASE_URL);
  try {
    const res = await request.get('/').timeout(5000);
    if (res.status >= 500) throw new Error(`Server returned HTTP ${res.status}`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Required API test server is not available at ${BASE_URL} (${reason}). ` +
        'Start one with `pnpm dev`, or set TEST_BASE_URL to a running deploy, then re-run `pnpm test:api`.',
    );
  }
});

describe('Supertest API Integration', () => {
  // ── Public Endpoints ─────────────────────────────────────────

  describe('GET /', () => {
    it('returns 200 with HTML', async () => {
      const res = await request.get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('GET /api/destinations', () => {
    it('returns 200 with JSON', async () => {
      const res = await request
        .get('/api/destinations')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/tours/public', () => {
    it('returns 200 with JSON', async () => {
      const res = await request
        .get('/api/tours/public')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ── Admin Endpoints (should require auth) ────────────────────

  describe('GET /api/admin/bookings (no auth)', () => {
    it('returns 401 without auth token', async () => {
      const res = await request.get('/api/admin/bookings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/bookings/:id (no auth)', () => {
    it('returns 401 without auth token', async () => {
      const res = await request
        .patch('/api/admin/bookings/000000000000000000000000')
        .send({ status: 'Confirmed' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/login', () => {
    it('returns 400 with empty body', async () => {
      const res = await request
        .post('/api/admin/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 with invalid credentials', async () => {
      const res = await request
        .post('/api/admin/login')
        .send({ email: 'fake@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Security Headers ─────────────────────────────────────────

  describe('Security Headers', () => {
    it('sets X-Frame-Options: DENY', async () => {
      const res = await request.get('/');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('sets X-Content-Type-Options: nosniff', async () => {
      const res = await request.get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('does not expose X-Powered-By', async () => {
      const res = await request.get('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ── 404 Handling ──────────────────────────────────────────────

  describe('404 Handling', () => {
    it('returns 404 for non-existent API route', async () => {
      const res = await request.get('/api/nonexistent-route-12345');
      expect(res.status).toBe(404);
    });
  });
});
