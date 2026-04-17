// app/api/tours/[tourId]/stop-sales/route.ts
//
// Public read-only endpoint that returns stop-saled dates for a tour within a
// given month. Used by the BookingSidebar calendar to grey out blocked dates
// before the user can pick them. Without this, the calendar only reflected
// day-of-week availability + capacity, and a user could select a date that
// the admin had already stop-saled — only to hit a disabled option card on
// the next step.

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StopSale from '@/lib/models/StopSale';
import Tour from '@/lib/models/Tour';
import { toDateOnlyString } from '@/utils/date';

export const dynamic = 'force-dynamic';

function toDateKey(d: Date) {
  return toDateOnlyString(d);
}

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> },
) {
  try {
    await dbConnect();
    const { tourId } = await params;

    const { searchParams } = new URL(request.url);
    const month = Number.parseInt(searchParams.get('month') || '', 10);
    const year = Number.parseInt(searchParams.get('year') || '', 10);

    if (!tourId || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'tourId, month, year are required' },
        { status: 400 },
      );
    }

    const rangeStart = toDateOnly(new Date(year, month - 1, 1));
    const rangeEnd = toDateOnly(new Date(year, month, 0));

    const stopSales = await StopSale.find({
      tourId,
      startDate: { $lte: rangeEnd },
      endDate: { $gte: rangeStart },
    })
      .select('optionIds startDate endDate reason')
      .lean();

    const tour = await Tour.findById(tourId).select('bookingOptions').lean();
    const optionIds = Array.isArray((tour as any)?.bookingOptions)
      ? (tour as any).bookingOptions
          .map((option: any, index: number) => option?.id || option?._id?.toString?.() || `option-${index}`)
          .filter(Boolean)
      : [];

    // Roll each stop-sale range into a per-day status map. A tour-level stop
    // sale (`optionIds: []`) marks the day as fully blocked; option-level
    // stop sales mark the day as "partial" and the specific blocked options
    // get listed so the frontend can show a targeted banner later.
    const days: Record<
      string,
      { status: 'full' | 'partial'; stoppedOptionIds: string[]; reasons: Record<string, string> }
    > = {};

    for (const ss of stopSales) {
      const ssStart = toDateOnly(new Date(ss.startDate));
      const ssEnd = toDateOnly(new Date(ss.endDate));
      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
        const day = toDateOnly(d);
        if (day < ssStart || day > ssEnd) continue;
        const key = toDateKey(day);

        if (!Array.isArray(ss.optionIds) || ss.optionIds.length === 0) {
          days[key] = {
            status: 'full',
            stoppedOptionIds: [],
            reasons: ss.reason ? { all: ss.reason } : {},
          };
          continue;
        }

        const existing = days[key] || { status: 'partial' as const, stoppedOptionIds: [], reasons: {} };
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

    // Dedupe per-day option lists
    for (const key of Object.keys(days)) {
      days[key].stoppedOptionIds = Array.from(new Set(days[key].stoppedOptionIds));

      if (days[key].status === 'partial' && optionIds.length === 0) {
        days[key] = {
          status: 'full',
          stoppedOptionIds: [],
          reasons: Object.keys(days[key].reasons).length > 0 ? days[key].reasons : {},
        };
      } else if (days[key].status === 'partial' && optionIds.length > 0) {
        const allStopped = optionIds.every((optionId: string) => days[key].stoppedOptionIds.includes(optionId));
        if (allStopped) {
          days[key] = {
            status: 'full',
            stoppedOptionIds: [],
            reasons: Object.keys(days[key].reasons).length > 0 ? days[key].reasons : {},
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tourId,
        month,
        year,
        days,
      },
    });
  } catch (error) {
    console.error('Error fetching stop-sales:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stop-sales' },
      { status: 500 },
    );
  }
}
