/**
 * City-nested URL type (/{destination}/{slug}) — client-requested structure
 * ("cityname/tourname", WhatsApp 2026-07-23). Tours only: they carry a
 * required owning destination. The mapping must:
 *  - build /{city}/{slug} when the city slug is known,
 *  - fall back to the tour's default root shape when it is not (the detail
 *    route then 301s to the city canonical — a hop, never a 404),
 *  - never let the city sentinel segment collide with fixed route segments.
 */

import {
  CITY_SEGMENT,
  URL_TYPES,
  URL_TYPE_LABELS,
  contentPath,
  localizedContentPath,
  segmentFor,
} from '@/lib/content/contentUrl';

describe('city urlType mapping', () => {
  it('is offered in the admin dropdown', () => {
    expect(URL_TYPES).toContain('city');
    expect(URL_TYPE_LABELS.city).toContain('{destination}');
  });

  it('builds the nested path when the destination slug is known', () => {
    expect(contentPath('tour', 'dolphin-house-trip', 'city', 'hurghada')).toBe(
      '/hurghada/dolphin-house-trip'
    );
  });

  it('falls back to the default root shape when no city slug is available', () => {
    expect(contentPath('tour', 'dolphin-house-trip', 'city')).toBe('/dolphin-house-trip');
    expect(contentPath('tour', 'dolphin-house-trip', 'city', null)).toBe('/dolphin-house-trip');
  });

  it('ignores a city slug for non-city url types', () => {
    expect(contentPath('tour', 'dolphin-house-trip', 'default', 'hurghada')).toBe(
      '/dolphin-house-trip'
    );
    expect(contentPath('tour', 'dolphin-house-trip', 'tour', 'hurghada')).toBe(
      '/tour/dolphin-house-trip'
    );
  });

  it('prefixes non-default locales', () => {
    expect(localizedContentPath('tour', 'dolphin-house-trip', 'city', 'de', 'hurghada')).toBe(
      '/de/hurghada/dolphin-house-trip'
    );
    expect(localizedContentPath('tour', 'dolphin-house-trip', 'city', 'en', 'hurghada')).toBe(
      '/hurghada/dolphin-house-trip'
    );
  });

  it('nests categories and attraction pages under their owning city the same way', () => {
    expect(contentPath('category', 'day-trips', 'city', 'hurghada')).toBe('/hurghada/day-trips');
    expect(contentPath('page', 'snorkeling', 'city', 'hurghada')).toBe('/hurghada/snorkeling');
  });

  it('category/page without an owning city fall back to their default segment', () => {
    expect(contentPath('category', 'day-trips', 'city')).toBe('/categories/day-trips');
    expect(contentPath('page', 'snorkeling', 'city')).toBe('/attraction/snorkeling');
  });

  it('city sentinel segment can never equal a fixed route segment', () => {
    expect(segmentFor('tour', 'city')).toBe(CITY_SEGMENT);
    for (const fixed of ['', 'tour', 'experience', 'destination', 'destinations', 'categories', 'attraction']) {
      expect(CITY_SEGMENT).not.toBe(fixed);
    }
  });
});
