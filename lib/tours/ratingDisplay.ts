/**
 * A tour's `rating` is an admin-editable number that lives independently of the
 * review collection, so a tour with no reviews can still carry one. Printing it
 * unconditionally advertises a score nobody gave — the same fabricated-figures
 * defect fixed on attraction templates in 3ed1b59. Resolve through here so a
 * rating only reaches a customer when real reviews back it.
 */

export function resolveReviewCount(reviews: unknown): number {
  if (Array.isArray(reviews)) return reviews.length;
  if (typeof reviews === 'number' && Number.isFinite(reviews)) {
    return Math.max(0, Math.trunc(reviews));
  }
  return 0;
}

export interface ProvableRating {
  rating: number;
  reviewCount: number;
}

export function provableRating(rating: unknown, reviews: unknown): ProvableRating | null {
  const reviewCount = resolveReviewCount(reviews);
  if (reviewCount < 1) return null;

  const value = typeof rating === 'number' && Number.isFinite(rating) ? rating : NaN;
  if (!(value > 0)) return null;

  return { rating: Math.round(value * 10) / 10, reviewCount };
}

/** "12 reviews" / "1 review" — for surfaces that render the score separately. */
export function reviewCountLabel(reviews: unknown): string {
  const count = resolveReviewCount(reviews);
  return `${count.toLocaleString()} ${count === 1 ? 'review' : 'reviews'}`;
}

/** "4.8 (12 reviews)" — or null when nothing is provable. Singular-safe. */
export function ratingLabel(rating: unknown, reviews: unknown): string | null {
  const provable = provableRating(rating, reviews);
  if (!provable) return null;
  return `${provable.rating} (${reviewCountLabel(reviews)})`;
}

/**
 * Score for a trip card: the rating only when reviews back it, read from the
 * stored review count or the reviews list, else null (show no score).
 */
export function tourCardRating(tour: { rating?: unknown; reviewCount?: unknown; reviews?: unknown } | null | undefined): number | null {
  if (!tour) return null;
  return provableRating(tour.rating, tour.reviewCount ?? tour.reviews)?.rating ?? null;
}

/** Average of the trips' provable ratings, one decimal, or null when none is provable. */
export function averageProvableRating(tours: Array<{ rating?: unknown; reviewCount?: unknown; reviews?: unknown }> | null | undefined): string | null {
  const scores = (tours || []).map(tourCardRating).filter((value): value is number => value !== null);
  if (scores.length === 0) return null;
  return (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1);
}
