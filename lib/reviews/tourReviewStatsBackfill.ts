/**
 * Backfill for trip review figures. Dry run unless `apply` is set.
 * Candidates are every trip that has a review record or already stores a
 * review count, so a stale count is corrected as well as a missing one.
 * A trip is only written when its stored figures differ from the computed ones.
 */
import Review from '@/lib/models/Review';
import Tour from '@/lib/models/Tour';
import { syncTourReviewStats } from '@/lib/reviews/tourReviewStats';

export interface BackfillChange {
  tourId: string;
  slug?: string;
  tenantId: string;
  from: { reviewCount: number | null; rating: number | null };
  to: { reviewCount: number; rating: number | null };
}

export interface BackfillReport {
  mode: 'dry-run' | 'apply';
  tripsChecked: number;
  reviewRecordsSeen: number;
  tripsWithPublishedReviews: number;
  changes: BackfillChange[];
  written: number;
}

export async function planTourReviewStatsBackfill(options: { apply?: boolean; now?: Date } = {}): Promise<BackfillReport> {
  const now = options.now ?? new Date();
  const [reviewedTourIds, countedTourIds, reviewRecordsSeen] = await Promise.all([
    Review.distinct('tour'),
    Tour.distinct('_id', { reviewCount: { $gt: 0 } }),
    Review.countDocuments({}),
  ]);
  const ids = [...new Map([...reviewedTourIds, ...countedTourIds].filter(Boolean).map((id) => [String(id), id])).values()];

  const changes: BackfillChange[] = [];
  let tripsWithPublishedReviews = 0;
  let written = 0;
  for (const id of ids) {
    const tour = await Tour.findById(id).select('_id slug tenantId reviewCount rating').lean<{
      _id: unknown; slug?: string; tenantId?: string | null; reviewCount?: number | null; rating?: number | null;
    } | null>();
    if (!tour) continue;
    const planned = await syncTourReviewStats(tour._id, { dryRun: true, now });
    if (!planned) continue;
    if (planned.reviewCount > 0) tripsWithPublishedReviews += 1;
    const storedCount = typeof tour.reviewCount === 'number' ? tour.reviewCount : null;
    const storedRating = typeof tour.rating === 'number' ? tour.rating : null;
    const countChanges = storedCount !== planned.reviewCount;
    const ratingChanges = planned.average !== null && storedRating !== planned.average;
    // A trip with no stored count and no published review needs no write: the
    // missing count already keeps its stored rating off the pages.
    if (storedCount === null && planned.reviewCount === 0) continue;
    if (!countChanges && !ratingChanges) continue;
    changes.push({
      tourId: String(tour._id),
      slug: tour.slug,
      tenantId: tour.tenantId || 'default',
      from: { reviewCount: storedCount, rating: storedRating },
      to: { reviewCount: planned.reviewCount, rating: planned.average ?? storedRating },
    });
    if (options.apply) {
      const result = await syncTourReviewStats(tour._id, { now });
      if (result?.written) written += 1;
    }
  }
  return {
    mode: options.apply ? 'apply' : 'dry-run',
    tripsChecked: ids.length,
    reviewRecordsSeen,
    tripsWithPublishedReviews,
    changes,
    written,
  };
}
