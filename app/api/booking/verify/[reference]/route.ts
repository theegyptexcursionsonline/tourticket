// app/api/booking/verify/[reference]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import type { PopulatedBookingTour } from '@/lib/types/populatedBooking';
import { enforcePublicActionLimits } from '@/lib/security/distributedAbuseLimit';

const VERIFICATION_WINDOW_MS = 15 * 60 * 1_000;

function verificationResponse(body: Record<string, unknown>, status: number, headers?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', ...headers },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference: rawReference } = await params;
    const reference = rawReference.trim().toUpperCase();

    if (!/^[A-Z0-9-]{12,80}$/.test(reference)) {
      return verificationResponse(
        { success: false, message: 'Booking reference is required' },
        400,
      );
    }

    await dbConnect();
    const rate = await enforcePublicActionLimits({
      request,
      action: 'booking-verify',
      subject: reference,
      networkLimit: 40,
      subjectLimit: 10,
      windowMs: VERIFICATION_WINDOW_MS,
    });
    if (!rate.allowed) {
      return verificationResponse(
        { success: false, message: 'Too many verification requests. Please try again later.' },
        429,
        { 'Retry-After': String(rate.retryAfterSeconds) },
      );
    }

    // Find booking by reference
    const booking = await Booking.findOne({
      bookingReference: reference,
      ...DEFAULT_TENANT_FILTER,
    })
      .populate({
        path: 'tour',
        model: Tour,
        select: 'title slug image duration rating',
      })
      .lean();

    if (!booking) {
      return verificationResponse(
        { success: false, message: 'Booking not found' },
        404,
      );
    }

    // Transform booking data for frontend
    const tour = booking.tour as unknown as PopulatedBookingTour;
    const transformedBooking = {
      bookingReference: booking.bookingReference,
      tour: {
        title: tour.title,
        image: tour.image,
        duration: tour.duration,
      },
      date: booking.date,
      time: booking.time,
      guests: booking.guests,
      status: booking.status,
      selectedBookingOption: booking.selectedBookingOption
        ? { title: booking.selectedBookingOption.title }
        : undefined,
    };

    return verificationResponse(
      {
        success: true,
        booking: transformedBooking,
      },
      200,
    );
  } catch (error) {
    console.error('Error verifying booking:', error);
    return verificationResponse(
      {
        success: false,
        message: 'Failed to verify booking',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      },
      500,
    );
  }
}
