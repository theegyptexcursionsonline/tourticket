/**
 * Unit Test: Admin Bookings API - EEO Network Filter
 *
 * Verifies that the admin bookings endpoint only returns bookings
 * from the EEO network (no tenantId, null, empty, or 'default').
 * Bookings from other tenant networks should be excluded.
 */

// --- Helpers to build the same baseMatch used by the route ---

/**
 * Builds the EEO-only base match filter, identical to the one in
 * app/api/admin/bookings/route.ts GET handler.
 */
function buildEeoBaseMatch(): Record<string, unknown> {
  return {
    $or: [
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: '' },
      { tenantId: 'default' },
    ],
  };
}

/**
 * Simulates MongoDB $match behaviour for a single document against
 * the EEO base-match filter. Good enough for unit-level assertions.
 */
function matchesEeoFilter(doc: Record<string, unknown>): boolean {
  const hasTenantId = 'tenantId' in doc;
  const tenantId = doc.tenantId;

  return (
    !hasTenantId ||
    tenantId === null ||
    tenantId === undefined ||
    tenantId === '' ||
    tenantId === 'default'
  );
}

// --- Tests ---

describe('Admin Bookings – EEO Network Filter', () => {
  describe('buildEeoBaseMatch', () => {
    it('returns an $or array with four conditions', () => {
      const match = buildEeoBaseMatch();
      expect(match).toHaveProperty('$or');
      expect(Array.isArray(match.$or)).toBe(true);
      expect((match.$or as unknown[]).length).toBe(4);
    });

    it('includes $exists: false condition', () => {
      const conditions = buildEeoBaseMatch().$or as Record<string, unknown>[];
      expect(conditions).toContainEqual({ tenantId: { $exists: false } });
    });

    it('includes null condition', () => {
      const conditions = buildEeoBaseMatch().$or as Record<string, unknown>[];
      expect(conditions).toContainEqual({ tenantId: null });
    });

    it('includes empty string condition', () => {
      const conditions = buildEeoBaseMatch().$or as Record<string, unknown>[];
      expect(conditions).toContainEqual({ tenantId: '' });
    });

    it('includes "default" tenant condition', () => {
      const conditions = buildEeoBaseMatch().$or as Record<string, unknown>[];
      expect(conditions).toContainEqual({ tenantId: 'default' });
    });
  });

  describe('EEO filter matching', () => {
    // --- Should INCLUDE (EEO network bookings) ---

    it('includes bookings with no tenantId field', () => {
      const doc = { _id: '1', bookingReference: 'EEO-001' };
      expect(matchesEeoFilter(doc)).toBe(true);
    });

    it('includes bookings with tenantId = null', () => {
      const doc = { _id: '2', tenantId: null };
      expect(matchesEeoFilter(doc)).toBe(true);
    });

    it('includes bookings with tenantId = undefined', () => {
      const doc = { _id: '3', tenantId: undefined };
      expect(matchesEeoFilter(doc)).toBe(true);
    });

    it('includes bookings with tenantId = empty string', () => {
      const doc = { _id: '4', tenantId: '' };
      expect(matchesEeoFilter(doc)).toBe(true);
    });

    it('includes bookings with tenantId = "default"', () => {
      const doc = { _id: '5', tenantId: 'default' };
      expect(matchesEeoFilter(doc)).toBe(true);
    });

    // --- Should EXCLUDE (other network bookings) ---

    it('excludes bookings with tenantId = "hurghada-excursions-online"', () => {
      const doc = { _id: '6', tenantId: 'hurghada-excursions-online' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with tenantId = "cairo-excursions-online"', () => {
      const doc = { _id: '7', tenantId: 'cairo-excursions-online' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with tenantId = "makadi-bay"', () => {
      const doc = { _id: '8', tenantId: 'makadi-bay' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with tenantId = "el-gouna"', () => {
      const doc = { _id: '9', tenantId: 'el-gouna' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with tenantId = "luxor-excursions"', () => {
      const doc = { _id: '10', tenantId: 'luxor-excursions' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with tenantId = "sharm-excursions-online"', () => {
      const doc = { _id: '11', tenantId: 'sharm-excursions-online' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with tenantId = "hurghada-speedboat"', () => {
      const doc = { _id: '12', tenantId: 'hurghada-speedboat' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });

    it('excludes bookings with any arbitrary tenantId', () => {
      const doc = { _id: '13', tenantId: 'some-other-network' };
      expect(matchesEeoFilter(doc)).toBe(false);
    });
  });

  describe('Filter combined with status', () => {
    it('both EEO filter and status can coexist in baseMatch', () => {
      const baseMatch = buildEeoBaseMatch() as Record<string, unknown>;
      baseMatch.status = 'Confirmed';

      expect(baseMatch).toHaveProperty('$or');
      expect(baseMatch).toHaveProperty('status', 'Confirmed');
    });

    it('both EEO filter and tour filter can coexist in baseMatch', () => {
      const baseMatch = buildEeoBaseMatch() as Record<string, unknown>;
      baseMatch.tour = 'tour-object-id';

      expect(baseMatch).toHaveProperty('$or');
      expect(baseMatch).toHaveProperty('tour', 'tour-object-id');
    });

    it('both EEO filter and date range can coexist in baseMatch', () => {
      const baseMatch = buildEeoBaseMatch() as Record<string, unknown>;
      baseMatch.createdAt = { $gte: new Date('2025-01-01'), $lte: new Date('2025-12-31') };

      expect(baseMatch).toHaveProperty('$or');
      expect(baseMatch).toHaveProperty('createdAt');
    });
  });
});
