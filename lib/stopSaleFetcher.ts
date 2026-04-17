// Server-side stop-sale fetcher.
//
// Runs the same aggregation the /api/tours/[tourId]/stop-sales route does,
// but called in-process from Server Components so the tour detail page can
// pre-hydrate BookingSidebar's stop-sale state. Without this, the calendar
// had to make 6 client-side fetches on mount, and on slow connections the
// loading window was long enough that customers complained.
//
// Returns the same shape the existing API returns per day so the client
// component logic stays identical.

import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { toDateOnlyString } from '@/utils/date';

export interface StopSaleDayInfo {
  status: 'full' | 'partial';
  stoppedOptionIds: string[];
  reasons: Record<string, string>;
}

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Returns a YYYY-MM-DD-keyed map covering today + the next `monthsAhead`
// months. Only dates with stop-sale coverage appear in the map.
export async function getStopSaleDatesForTour(
  tourId: string,
  monthsAhead = 6,
): Promise<Record<string, StopSaleDayInfo>> {
  if (!tourId) return {};

  try {
    await dbConnect();

    const today = toDateOnly(new Date());
    const rangeEnd = new Date(today);
    rangeEnd.setMonth(rangeEnd.getMonth() + monthsAhead);

    const [stopSales, tour] = await Promise.all([
      StopSale.find({
        tourId,
        startDate: { $lte: rangeEnd },
        endDate: { $gte: today },
      })
        .select('optionIds startDate endDate reason')
        .lean(),
      Tour.findById(tourId).select('bookingOptions').lean(),
    ]);

    if (stopSales.length === 0) return {};

    const tourOptionIds = Array.isArray((tour as any)?.bookingOptions)
      ? (tour as any).bookingOptions
          .map(
            (option: any, index: number) =>
              option?.id || option?._id?.toString?.() || `option-${index}`,
          )
          .filter(Boolean)
      : [];

    const days: Record<string, StopSaleDayInfo> = {};

    for (const ss of stopSales) {
      const ssStart = toDateOnly(new Date(ss.startDate));
      const ssEnd = toDateOnly(new Date(ss.endDate));
      const windowStart = ssStart > today ? ssStart : today;
      const windowEnd = ssEnd < rangeEnd ? ssEnd : rangeEnd;

      for (
        let d = new Date(windowStart);
        d <= windowEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const key = toDateOnlyString(d);

        if (!Array.isArray(ss.optionIds) || ss.optionIds.length === 0) {
          days[key] = {
            status: 'full',
            stoppedOptionIds: [],
            reasons: ss.reason ? { all: ss.reason } : {},
          };
          continue;
        }

        const existing =
          days[key] || {
            status: 'partial' as const,
            stoppedOptionIds: [] as string[],
            reasons: {} as Record<string, string>,
          };
        if (existing.status === 'full') continue;
        existing.stoppedOptionIds.push(...ss.optionIds);
        if (ss.reason) {
          for (const optionId of ss.optionIds) {
            existing.reasons[optionId] = ss.reason;
          }
        }
        existing.status = 'partial';
        days[key] = existing;
      }
    }

    // Promote "partial" days that cover every tour option to "full".
    for (const key of Object.keys(days)) {
      days[key].stoppedOptionIds = Array.from(new Set(days[key].stoppedOptionIds));
      if (days[key].status === 'partial' && tourOptionIds.length > 0) {
        const allStopped = tourOptionIds.every((optionId: string) =>
          days[key].stoppedOptionIds.includes(optionId),
        );
        if (allStopped) {
          days[key] = {
            status: 'full',
            stoppedOptionIds: [],
            reasons: Object.keys(days[key].reasons).length > 0 ? days[key].reasons : {},
          };
        }
      }
    }

    return days;
  } catch (err) {
    // Non-fatal: the client fetch in BookingSidebar will still populate state.
    console.warn('[stopSaleFetcher] failed:', err);
    return {};
  }
}
