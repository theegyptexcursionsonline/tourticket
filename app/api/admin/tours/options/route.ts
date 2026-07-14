// app/api/admin/tours/options/route.ts
// Lightweight endpoint returning fields needed by admin tour selectors and
// the manual-booking quote flow.
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export async function GET(request: NextRequest) {
  // This endpoint is read-only and is required by booking filters/forms as
  // well as tour management. Do not force booking operators to gain tour
  // mutation privileges just to resolve a tour title.
  const auth = await requireAdminAuth(request, {
    permissions: ['manageTours', 'manageBookings'],
    requireAll: false,
  });
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const tours = await Tour.find({ ...DEFAULT_TENANT_FILTER })
      .select('title slug price originalPrice discountPrice bookingOptions')
      .sort({ title: 1 })
      .lean();

    const data = tours.map((t) => ({
      _id: String(t._id),
      id: String(t._id),
      title: t.title,
      slug: t.slug,
      price: t.price,
      originalPrice: t.originalPrice,
      discountPrice: t.discountPrice,
      bookingOptions: t.bookingOptions || [],
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch tour options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tour options' }, { status: 500 });
  }
}
