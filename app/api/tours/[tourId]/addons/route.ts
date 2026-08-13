import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { isPerPersonAddOn, resolveAddOnPricingMethod } from '@/lib/checkout/addOnPricing';
import { normalizedBookingOptionKeys } from '@/lib/bookings/addOnAvailability';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;

  if (!/^[a-f0-9]{24}$/i.test(tourId)) {
    return NextResponse.json({ message: 'A valid tour ID is required' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }

  try {
    await dbConnect();

    const tour = await Tour.findOne({ _id: tourId, isPublished: true, ...DEFAULT_TENANT_FILTER })
      .select('_id addOns')
      .lean();

    if (!tour) {
      return NextResponse.json({ message: 'Tour not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
    }

    // A catalogue read must never manufacture products or discounts. Checkout
    // accepts these stable authored ids and re-resolves every price server-side.
    const addOns = (tour.addOns || [])
      .map((addon) => ({
        id: String(addon._id || ''),
        title: addon.name,
        description: addon.description || '',
        price: Number(addon.price),
        category: addon.category || 'Experience',
        perGuest: isPerPersonAddOn(addon),
        pricingMethod: resolveAddOnPricingMethod(addon),
        groupKey: addon.groupKey || '',
        groupTitle: addon.groupTitle || '',
        bookingOptionKeys: normalizedBookingOptionKeys(addon),
        maxQuantity: 1,
        required: false,
      }))
      .filter((addon) => Boolean(addon.id && addon.title) && Number.isFinite(addon.price) && addon.price >= 0);

    return NextResponse.json(addOns, { headers: { 'Cache-Control': 'private, no-store' } });

  } catch (error) {
    console.error('Failed to fetch tour add-ons:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching tour add-ons.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
