// app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Destination from '@/lib/models/Destination';
import { EmailService } from '@/lib/email/emailService';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';

// Helper function to generate unique booking reference
async function generateUniqueBookingReference(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = 'EEO';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `${prefix}-${timestamp}-${random}`;
    
    const existing = await Booking.findOne({ bookingReference: reference }).lean();
    
    if (!existing) {
      return reference;
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return `EEO-${Date.now()}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

// Format date for display
function formatBookingDate(dateString: string | Date | undefined): string {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function GET() {
  await dbConnect();

  try {
    const bookings = await Booking.find({})
      .populate({ 
        path: 'tour', 
        model: Tour, 
        select: 'title image duration destination',
        populate: {
          path: 'destination',
          model: Destination,
          select: 'name slug',
        }
      })
      .populate({ 
        path: 'user', 
        model: User, 
        select: 'name email firstName lastName' 
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out bookings with null tours (deleted tours)
    const validBookings = bookings.filter(booking => booking.tour !== null);

    return NextResponse.json(validBookings);
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST - Create manual booking
export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const {
      tourId,
      customer,
      booking,
      pricing,
      payment,
      specialRequests,
      hotelPickupDetails,
      internalNotes,
      isManualBooking = true,
    } = body;

    // Validate required fields
    if (!tourId) {
      return NextResponse.json({ error: 'Tour ID is required' }, { status: 400 });
    }

    if (!customer?.email || !customer?.firstName || !customer?.lastName) {
      return NextResponse.json({ error: 'Customer details are required' }, { status: 400 });
    }

    if (!booking?.date) {
      return NextResponse.json({ error: 'Booking date is required' }, { status: 400 });
    }

    // Verify tour exists
    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Find or create user
    let user = await User.findOne({ email: customer.email });
    
    if (!user) {
      try {
        user = await User.create({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          password: 'manual-booking-' + Math.random().toString(36).substring(2, 15),
        });
        console.log(`[Manual Booking] Created new user: ${customer.email}`);
      } catch (userError: any) {
        if (userError.code === 11000) {
          user = await User.findOne({ email: customer.email });
        } else {
          throw userError;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create or find user' }, { status: 500 });
    }

    // Calculate totals
    const bookingDate = parseLocalDate(booking.date) || new Date();
    const bookingDateString = ensureDateOnlyString(booking.date);
    const bookingTime = booking.time || '10:00';
    const totalGuests = (booking.adultGuests || 1) + (booking.childGuests || 0) + (booking.infantGuests || 0);

    // Determine status based on payment
    const bookingStatus = payment?.status === 'paid' ? 'Confirmed' : 'Pending';

    // Determine payment method
    let paymentMethod = 'card';
    if (payment?.method === 'cash') paymentMethod = 'cash';
    else if (payment?.method === 'bank') paymentMethod = 'bank';
    else if (payment?.method === 'pay_later') paymentMethod = 'pay_later';

    // Generate booking reference
    const bookingReference = await generateUniqueBookingReference();

    // Create booking
    const newBooking = await Booking.create({
      bookingReference,
      tour: tour._id,
      user: user._id,
      date: bookingDate,
      dateString: bookingDateString,
      time: bookingTime,
      guests: totalGuests,
      totalPrice: pricing?.totalPrice || 0,
      status: bookingStatus,
      paymentId: payment?.externalPaymentId || `MANUAL-${Date.now()}`,
      paymentMethod,
      specialRequests: specialRequests || undefined,
      hotelPickupDetails: hotelPickupDetails || undefined,
      adultGuests: booking.adultGuests || 1,
      childGuests: booking.childGuests || 0,
      infantGuests: booking.infantGuests || 0,
      selectedBookingOption: booking.bookingOption || undefined,
      // Add edit history entry for manual creation
      editHistory: [{
        editedAt: new Date(),
        editedBy: 'admin',
        editedByName: 'Admin (Manual)',
        field: 'created',
        previousValue: 'N/A',
        newValue: 'Manual booking created',
        changeType: 'detail_update',
      }],
    });

    console.log(`[Manual Booking] Created booking ${bookingReference} for ${customer.email}`);

    // Send confirmation email to customer
    try {
      await EmailService.sendBookingConfirmation({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        tourTitle: tour.title,
        bookingDate: formatBookingDate(booking.date),
        bookingTime: bookingTime,
        participants: `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`,
        totalPrice: `$${(pricing?.totalPrice || 0).toFixed(2)}`,
        bookingId: bookingReference,
        bookingOption: booking.bookingOption?.title,
        specialRequests: specialRequests,
        hotelPickupDetails: hotelPickupDetails,
        meetingPoint: tour.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
        contactNumber: "+20 11 42255624",
        tourImage: tour.image,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
        customerPhone: customer.phone,
      });
      console.log(`[Manual Booking] Sent confirmation email to ${customer.email}`);
    } catch (emailError) {
      console.error('[Manual Booking] Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Send admin alert
    try {
      await EmailService.sendAdminBookingAlert({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tourTitle: tour.title,
        bookingId: bookingReference,
        bookingDate: formatBookingDate(booking.date),
        totalPrice: `$${(pricing?.totalPrice || 0).toFixed(2)}`,
        paymentMethod: `${paymentMethod} (Manual Entry)`,
        specialRequests: specialRequests,
        hotelPickupDetails: hotelPickupDetails,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      });
    } catch (emailError) {
      console.error('[Manual Booking] Failed to send admin alert:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: newBooking._id,
      bookingReference: bookingReference,
    });

  } catch (error: any) {
    console.error('[Manual Booking] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}