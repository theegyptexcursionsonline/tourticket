import { contentPath, attractionPagePath } from '@/lib/content/contentUrl';
import {
  nestedContentPath,
  sanitizeContentNavigation,
  systemParentPage,
} from '@/lib/content/contentNavigation';
import { practicalDefaultText } from '@/lib/tours/practicalDefaults';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('content navigation', () => {
  it('sanitizes a valid parent snapshot and breadcrumb label', () => {
    expect(sanitizeContentNavigation({
      breadcrumbLabel: '  Nile cruises  ',
      parentPage: {
        id: '64b64c9bfc13ae1f19e8a001',
        slug: 'nile-river',
        label: 'Nile River',
        kind: 'destination',
      },
    })).toEqual({
      breadcrumbLabel: 'Nile cruises',
      parentPage: {
        id: '64b64c9bfc13ae1f19e8a001',
        slug: 'nile-river',
        label: 'Nile River',
        kind: 'destination',
      },
    });
  });

  it('fails closed for an invalid parent without altering omitted partial-update fields', () => {
    expect(sanitizeContentNavigation({ title: 'Only title changed' })).toEqual({});
    expect(sanitizeContentNavigation({ parentPage: { slug: '../admin', label: 'Unsafe', kind: 'destination' } }))
      .toEqual({ parentPage: null });
    expect(sanitizeContentNavigation({ parentPage: null, breadcrumbLabel: '' }))
      .toEqual({ parentPage: null, breadcrumbLabel: '' });
  });

  it('uses the selected parent as the canonical path for every content type', () => {
    expect(nestedContentPath('luxor-day-trip', {
      slug: 'hurghada', label: 'Hurghada', kind: 'destination',
    })).toBe('/hurghada/luxor-day-trip');
    expect(contentPath('tour', 'luxor-day-trip', 'tour', null, 'hurghada'))
      .toBe('/hurghada/luxor-day-trip');
    expect(attractionPagePath('desert-safari', 'category', 'default', null, 'hurghada'))
      .toBe('/hurghada/desert-safari');
  });

  it('accepts only the allowlisted Egypt landing page as a static parent', () => {
    const egypt = systemParentPage('landing:egypt');
    expect(egypt).toEqual(expect.objectContaining({ slug: 'egypt', kind: 'landing', href: '/egypt' }));
    expect(systemParentPage('landing:admin')).toBeNull();
    expect(sanitizeContentNavigation({ parentPage: egypt })).toEqual({
      parentPage: {
        id: 'landing:egypt',
        slug: 'egypt',
        label: 'Egypt',
        kind: 'landing',
      },
    });
  });
});

describe('practical information defaults', () => {
  it('returns opt-in copy and never injects it implicitly', () => {
    expect(practicalDefaultText('whatToBring')).toContain('Camera for photos');
    expect(practicalDefaultText('weatherPolicy')).toContain('severe weather');
    expect(practicalDefaultText('needToKnow').split('\n')).toHaveLength(3);
  });

  it('renders multiline textarea hints as real line breaks', () => {
    const formSource = readFileSync(join(process.cwd(), 'components/TourForm.tsx'), 'utf8');
    expect(formSource).toContain('placeholder={"Hat and sunscreen\\nValid ID"}');
    expect(formSource).not.toMatch(/placeholder="[^"]*\\n/);
  });
});
