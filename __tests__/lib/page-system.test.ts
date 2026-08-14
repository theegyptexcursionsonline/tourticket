import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';
import { normalizePageTemplate } from '@/lib/content/pageTemplate';
import { meetingPointEmbedUrl, meetingPointMapUrl } from '@/lib/tours/meetingPointMap';
import {
  buildDefaultInternalLinkBlock,
  isSafeInternalHref,
  localizeInternalLinkBlock,
  sanitizeInternalLinkBlock,
} from '@/lib/navigation/internalLinks';

describe('page-system helpers', () => {
  it('keeps every tenant-resolved content route request-dynamic', () => {
    const routes = [
      'app/[locale]/[slug]/page.tsx',
      'app/[locale]/[slug]/[child]/page.tsx',
      'app/[locale]/tour/[slug]/page.tsx',
      'app/[locale]/experience/[slug]/page.tsx',
      'app/[locale]/destination/[slug]/page.tsx',
      'app/[locale]/destinations/[slug]/page.tsx',
      'app/[locale]/categories/[slug]/page.tsx',
      'app/[locale]/attraction/[slug]/page.tsx',
    ];

    for (const route of routes) {
      const source = readFileSync(join(process.cwd(), route), 'utf8');
      expect(source).toMatch(/export const dynamic = ['"]force-dynamic['"];/);
    }
  });

  it('normalizes the three supported landing templates and fails back to classic', () => {
    expect(normalizePageTemplate('classic')).toBe('classic');
    expect(normalizePageTemplate('editorial')).toBe('editorial');
    expect(normalizePageTemplate('immersive')).toBe('immersive');
    expect(normalizePageTemplate('unknown')).toBe('classic');
  });

  it('builds parent-aware breadcrumbs with the authoritative parent URL', () => {
    expect(buildContentBreadcrumbs({
      currentTitle: 'Luxor day trip',
      breadcrumbLabel: 'Luxor from Hurghada',
      parentPage: {
        id: 'parent',
        slug: 'hurghada',
        label: 'Hurghada',
        kind: 'destination',
        href: '/destinations/hurghada',
      },
      rootLabel: 'Tours',
      rootHref: '/tours',
    })).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Hurghada', href: '/destinations/hurghada' },
      { label: 'Luxor from Hurghada' },
    ]);
  });

  it('treats an explicitly selected Home parent as the breadcrumb root', () => {
    expect(buildContentBreadcrumbs({
      currentTitle: 'Nile cruise',
      parentPage: null,
      rootLabel: 'Tours',
      rootHref: '/search',
    })).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Nile cruise' },
    ]);
  });

  it('renders the live tour page from the saved parent-aware breadcrumb contract', () => {
    const source = readFileSync(join(process.cwd(), 'app/[locale]/[slug]/TourDetailClientPage.tsx'), 'utf8');

    expect(source).toContain("import ContentBreadcrumbs from '@/components/navigation/ContentBreadcrumbs';");
    expect(source).toContain("import { buildContentBreadcrumbs } from '@/lib/content/breadcrumbs';");
    expect(source).toContain('parentPage: tour.parentPage');
    expect(source).toContain("rootLabel: 'Tours'");
    expect(source).toContain("rootHref: '/search'");
    expect(source).toContain('<ContentBreadcrumbs items={breadcrumbs} />');
    expect(source).not.toContain('<nav className="flex items-center gap-1.5 text-xs">');
  });

  it('creates encoded Google map links only for non-empty meeting points', () => {
    expect(meetingPointMapUrl(' Marina, Hurghada ')).toBe('https://www.google.com/maps/search/?api=1&query=Marina%2C%20Hurghada');
    expect(meetingPointEmbedUrl('Marina, Hurghada')).toBe('https://www.google.com/maps?q=Marina%2C%20Hurghada&output=embed');
    expect(meetingPointMapUrl('   ')).toBeNull();
    expect(meetingPointEmbedUrl(null)).toBeNull();
  });

  it('renders the tour meeting point through the resilient no-key map helper', () => {
    const source = readFileSync(join(process.cwd(), 'app/[locale]/[slug]/TourDetailClientPage.tsx'), 'utf8');
    expect(source).toContain("import { meetingPointEmbedUrl, meetingPointMapUrl } from '@/lib/tours/meetingPointMap';");
    expect(source).toContain('src={meetingMapEmbed}');
    expect(source).not.toContain('/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}');
  });

  it('keeps only safe, complete internal links and localizes with English fallback', () => {
    expect(isSafeInternalHref('/destinations/hurghada')).toBe(true);
    expect(isSafeInternalHref('//attacker.example')).toBe(false);
    expect(isSafeInternalHref('https://attacker.example')).toBe(false);

    const block = sanitizeInternalLinkBlock({
      enabled: true,
      heading: { en: 'Explore Egypt', de: 'Ägypten entdecken' },
      groups: [{
        id: 'destinations',
        title: { en: 'Destinations' },
        links: [
          { id: 'hurghada', label: { en: 'Hurghada' }, href: '/destinations/hurghada' },
          { id: 'external', label: { en: 'Unsafe' }, href: 'https://attacker.example' },
          { id: 'missing-label', label: {}, href: '/missing' },
        ],
      }],
    });

    expect(block.groups[0].links).toHaveLength(1);
    expect(localizeInternalLinkBlock(block, 'de')).toEqual({
      enabled: true,
      heading: 'Ägypten entdecken',
      groups: [{
        id: 'destinations',
        title: 'Destinations',
        links: [{ id: 'hurghada', label: 'Hurghada', href: '/destinations/hurghada' }],
      }],
    });
  });

  it('generates usable default groups and de-duplicates maximum-length ids safely', () => {
    const longId = 'a'.repeat(64);
    const block = buildDefaultInternalLinkBlock([
      { id: longId, title: 'One', items: [{ id: longId, label: 'A', href: '/a' }] },
      { id: longId, title: 'Two', items: [{ id: longId, label: 'B', href: '/b' }] },
    ]);
    expect(block.groups).toHaveLength(2);
    expect(block.groups[0].id).not.toBe(block.groups[1].id);
    expect(block.groups.every((group) => group.id.length <= 64)).toBe(true);
  });
});
