import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour, { type IBookingOption } from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest } from '@/lib/revenue/machineResponse';
import { STANDARD_OPTION_KEY, catalogueGuestPrices } from '@/lib/revenue/pricingResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const tours = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER })
    .select('_id title slug discountPrice originalPrice bookingOptions pricingSummary updatedAt')
    .sort({ _id: 1 }).lean();
  return NextResponse.json({
    tenantId: 'default',
    currency: 'USD',
    tours: tours.map((tour) => ({
      id: String(tour._id), title: tour.title, slug: tour.slug, updatedAt: tour.updatedAt,
      pricingSummary: tour.pricingSummary || null,
      options: [
        { key: STANDARD_OPTION_KEY, label: 'Standard Experience', guestPrices: catalogueGuestPrices(Number(tour.discountPrice)) },
        ...(tour.bookingOptions || []).map((option: IBookingOption) => ({
          key: option.pricingKey, label: option.label, type: option.type,
          guestPrices: catalogueGuestPrices(Number(option.price)),
        })),
      ],
    })),
    channels: { eeo_direct: 'connected', getyourguide: 'not_connected', viator: 'not_connected' },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
