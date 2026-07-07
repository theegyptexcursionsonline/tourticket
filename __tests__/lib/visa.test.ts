import { checkVisa, NATIONALITIES, normSlug, EVISA_COST } from '@/lib/tools/visa';

describe('visa checker — local model', () => {
  it('maps well-known nationalities to the right category', () => {
    expect(checkVisa('united-states').category).toBe('evisa_or_arrival');
    expect(checkVisa('United States').cost).toBe(EVISA_COST);
    expect(checkVisa('Saudi Arabia').category).toBe('visa_free');
    expect(checkVisa('india').category).toBe('evisa_only');
  });

  it('falls back to embassy guidance for unknown nationalities', () => {
    const r = checkVisa('atlantis');
    expect(r.category).toBe('embassy');
    expect(r.known).toBe(false);
    expect(r.cost).toBeNull();
  });

  it('every result carries steps, official portal link and a disclaimer', () => {
    const r = checkVisa('germany');
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.official).toContain('visa2egypt');
    expect(r.disclaimer).toMatch(/guidance only/i);
  });

  it('visa-free gives a 90-day stay at no cost', () => {
    const r = checkVisa('uae');
    expect(r.cost).toBe(0);
    expect(r.stayDays).toBe(90);
    expect(r.requirement).toMatch(/no visa/i);
  });

  it('normalises free-text and exposes a sorted nationality list', () => {
    expect(normSlug('  United   Kingdom! ')).toBe('united-kingdom');
    expect(NATIONALITIES.length).toBeGreaterThan(30);
    expect(NATIONALITIES[0].name.localeCompare(NATIONALITIES[1].name)).toBeLessThanOrEqual(0);
  });
});
