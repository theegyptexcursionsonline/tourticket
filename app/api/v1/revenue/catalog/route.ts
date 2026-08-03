import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour, { type IBookingOption } from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { authenticateRevenueRequest } from '@/lib/revenue/machineResponse';
import { STANDARD_OPTION_KEY } from '@/lib/revenue/pricingResolver';
import { explicitCatalogueGuestPrices } from '@/lib/revenue/guestPrices';
import { effectiveOptionPrice } from '@/lib/pricing/effectivePrice';
import { pricingCatalogueVersion } from '@/lib/revenue/pricingVersion';
import { pricingProjectionStatus } from '@/lib/revenue/pricingSummary';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authenticateRevenueRequest(request);
  if (auth.response) return auth.response;
  await dbConnect();
  // Selecting the same pricing fields the resolver selects keeps
  // pricingCatalogueVersion() identical between this export and the
  // price-write guard — a mismatch would block every write as stale.
  const tours = await Tour.find({ isPublished: true, ...DEFAULT_TENANT_FILTER })
    .select('_id title slug discountPrice discountPercent originalPrice revenueGuestPrices bookingOptions availability pricingSummary pricingSearchProjection updatedAt')
    .sort({ _id: 1 }).lean();
  return NextResponse.json({
    tenantId: 'default',
    currency: 'USD',
    tours: tours.map((tour) => ({
      id: String(tour._id), title: tour.title, slug: tour.slug, updatedAt: tour.updatedAt, sourceVersion: pricingCatalogueVersion(tour),
      pricingSummary: tour.pricingSummary || null,
      pricingSearchProjection: tour.pricingSearchProjection || null,
      channelPropagation: {
        eeo_direct: pricingProjectionStatus(tour).state,
        getyourguide: 'not_connected',
        viator: 'not_connected',
      },
      options: [
        (() => { const guest = explicitCatalogueGuestPrices(Number(tour.discountPrice), tour.revenueGuestPrices); return { key: STANDARD_OPTION_KEY, label: 'Standard Experience', guestPrices: guest.prices, guestPricesVerified: guest.verified }; })(),
        ...(tour.bookingOptions || []).map((option: IBookingOption) => ({
          key: option.pricingKey, label: option.label, type: option.type,
          // RevenuePilot must see the price checkout actually charges, so the
          // catalogue adult goes through the shared discount helper.
          ...(() => { const guest = explicitCatalogueGuestPrices(effectiveOptionPrice(tour, option).price, option.guestPrices); return { guestPrices: guest.prices, guestPricesVerified: guest.verified }; })(),
        })),
      ],
    })),
    channels: { eeo_direct: 'connected', getyourguide: 'not_connected', viator: 'not_connected' },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
