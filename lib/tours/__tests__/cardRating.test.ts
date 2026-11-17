/**
 * @jest-environment node
 */
import { averageProvableRating, tourCardRating } from '@/lib/tours/ratingDisplay';

describe('tourCardRating', () => {
  it('returns null when no review backs the admin-set rating', () => {
    expect(tourCardRating({ rating: 4.5 })).toBeNull();
    expect(tourCardRating({ rating: 4.5, reviewCount: 0 })).toBeNull();
    expect(tourCardRating({ rating: 4.5, reviews: [] })).toBeNull();
    expect(tourCardRating({ rating: 0, reviewCount: 4 })).toBeNull();
    expect(tourCardRating({ rating: Number.NaN, reviewCount: 4 })).toBeNull();
    expect(tourCardRating(undefined)).toBeNull();
  });

  it('returns the rounded score when reviews back it (count or list)', () => {
    expect(tourCardRating({ rating: 4.66, reviewCount: 3 })).toBe(4.7);
    expect(tourCardRating({ rating: 4.2, reviews: ['a'] })).toBe(4.2);
    expect(tourCardRating({ rating: 5, reviewCount: '7' as unknown as number })).toBeNull();
  });
});

describe('averageProvableRating', () => {
  it('averages reviewed trips only and is null when none is reviewed', () => {
    expect(averageProvableRating([{ rating: 4.5 }, { rating: 4.5, reviewCount: 0 }])).toBeNull();
    expect(averageProvableRating([{ rating: 4.5 }, { rating: 4, reviewCount: 2 }, { rating: 5, reviews: ['x'] }])).toBe('4.5');
    expect(averageProvableRating(undefined)).toBeNull();
  });
});
