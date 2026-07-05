import {
  segmentFor,
  contentPath,
  localizedContentPath,
  normalizeUrlType,
} from '@/lib/content/contentUrl';

describe('contentUrl helper', () => {
  describe('normalizeUrlType', () => {
    it('keeps valid url types', () => {
      expect(normalizeUrlType('tour')).toBe('tour');
      expect(normalizeUrlType('direct')).toBe('direct');
    });
    it('falls back to default for unknown/empty', () => {
      expect(normalizeUrlType(undefined)).toBe('default');
      expect(normalizeUrlType(null)).toBe('default');
      expect(normalizeUrlType('bogus')).toBe('default');
    });
  });

  describe('segmentFor (default preserves current live behaviour)', () => {
    it('tour default = root', () => expect(segmentFor('tour', 'default')).toBe(''));
    it('destination default = destinations', () => expect(segmentFor('destination', 'default')).toBe('destinations'));
    it('category default = categories', () => expect(segmentFor('category', 'default')).toBe('categories'));
    it('unset behaves like default', () => expect(segmentFor('destination', undefined)).toBe('destinations'));
  });

  describe('segmentFor (explicit choices)', () => {
    it('direct → root for any type', () => {
      expect(segmentFor('tour', 'direct')).toBe('');
      expect(segmentFor('destination', 'direct')).toBe('');
      expect(segmentFor('category', 'direct')).toBe('');
    });
    it('maps to the chosen word', () => {
      expect(segmentFor('destination', 'tour')).toBe('tour');
      expect(segmentFor('tour', 'experience')).toBe('experience');
      expect(segmentFor('category', 'destination')).toBe('destination');
    });
  });

  describe('contentPath', () => {
    it('root for direct/default tours', () => {
      expect(contentPath('tour', 'luxor-day-trip', 'default')).toBe('/luxor-day-trip');
      expect(contentPath('tour', 'luxor-day-trip', 'direct')).toBe('/luxor-day-trip');
    });
    it('prefixes chosen segments', () => {
      expect(contentPath('tour', 'luxor-day-trip', 'tour')).toBe('/tour/luxor-day-trip');
      expect(contentPath('destination', 'cairo', 'experience')).toBe('/experience/cairo');
      expect(contentPath('destination', 'cairo', 'default')).toBe('/destinations/cairo');
      expect(contentPath('category', 'diving', 'default')).toBe('/categories/diving');
    });
  });

  describe('localizedContentPath', () => {
    it('default locale (en) is un-prefixed', () => {
      expect(localizedContentPath('tour', 'x', 'tour', 'en')).toBe('/tour/x');
    });
    it('non-default locale gets a prefix', () => {
      expect(localizedContentPath('tour', 'x', 'tour', 'de')).toBe('/de/tour/x');
      expect(localizedContentPath('destination', 'cairo', 'direct', 'fr')).toBe('/fr/cairo');
    });
  });
});
