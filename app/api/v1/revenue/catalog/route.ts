import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour, { type IBookingOption } from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest } from '@/lib/revenue/machineResponse';
import { STANDARD_OPTION_KEY } from '@/lib/revenue/pricingResolver';
import { explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { pricingCatalogueVersion } from '@/lib/revenue/pricingVersion';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  const tours = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER })
    .select('_id title slug discountPrice originalPrice revenueGuestPrices bookingOptions pricingSummary pricingSearchProjection updatedAt')
    .sort({ _id: 1 }).lean();
  return NextResponse.json({
    tenantId: 'default',
    currency: 'USD',
    tours: tours.map((tour) => ({
      id: String(tour._id), title: tour.title, slug: tour.slug, updatedAt: tour.updatedAt, sourceVersion: pricingCatalogueVersion(tour),
      pricingSummary: tour.pricingSummary || null,
      pricingSearchProjection: tour.pricingSearchProjection || null,
      channelPropagation: {
        eeo_direct: tour.pricingSearchProjection?.status === 'verified'
          ? 'verified'
          : tour.pricingSearchProjection?.status === 'failed' ? 'failed' : 'pending',
        getyourguide: 'not_connected',
        viator: 'not_connected',
      },
      options: [
        (() => { const guest = explicitCatalogueGuestPrices(Number(tour.discountPrice), tour.revenueGuestPrices); return { key: STANDARD_OPTION_KEY, label: 'Standard Experience', guestPrices: guest.prices, guestPricesVerified: guest.verified }; })(),
        ...(tour.bookingOptions || []).map((option: IBookingOption) => ({
          key: option.pricingKey, label: option.label, type: option.type,
          ...(() => { const guest = explicitCatalogueGuestPrices(Number(option.price), option.guestPrices); return { guestPrices: guest.prices, guestPricesVerified: guest.verified }; })(),
        })),
      ],
    })),
    channels: { eeo_direct: 'connected', getyourguide: 'not_connected', viator: 'not_connected' },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
