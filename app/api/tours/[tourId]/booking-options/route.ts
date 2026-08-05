import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { hasOnlyConfiguredTimeSlots } from '@/lib/pricing/bookingOptionSlots';

async function PUTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ tourId: string }> }
) {
  try {
    const adminAuth = await requireAdminAuth(request, {
      permissions: ['manageTours'],
    });
    if (adminAuth instanceof NextResponse) {
      return adminAuth;
    }

    await dbConnect();
    
    const { index, option } = await request.json();
    const { tourId } = await params;

    if (!Number.isInteger(index) || index < 0 || !option || typeof option !== 'object') {
      return NextResponse.json({ error: 'Invalid booking option' }, { status: 400 });
    }

    const tour = await Tour.findOne({ _id: tourId, ...DEFAULT_TENANT_FILTER });
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    if (!hasOnlyConfiguredTimeSlots(option.timeSlots, tour.availability?.slots)) {
      return NextResponse.json(
        { error: 'Booking option contains a time slot that is not in tour availability' },
        { status: 400 },
      );
    }

    // Ensure bookingOptions array exists
    if (!tour.bookingOptions) {
      tour.bookingOptions = [];
    }

    // Update or add the option at the specified index
    if (index < tour.bookingOptions.length) {
      tour.bookingOptions[index] = option;
    } else {
      tour.bookingOptions.push(option);
    }

    await tour.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Booking option updated successfully',
      bookingOptions: tour.bookingOptions 
    });

  } catch (error: unknown) {
    console.error('Update booking option error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking option' },
      { status: 500 }
    );
  }
}

export const PUT = withAdminAudit(PUTHandler);
