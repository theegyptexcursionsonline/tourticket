// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import Destination from '@/lib/models/Destination';
import mongoose from 'mongoose';
import { EmailService } from '@/lib/email/emailService';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

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

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || 'all').trim();
    const tourIdParam = (searchParams.get('tourId') || '').trim();
    const purchaseFrom = (searchParams.get('purchaseFrom') || '').trim();
    const purchaseTo = (searchParams.get('purchaseTo') || '').trim();
    const activityFrom = (searchParams.get('activityFrom') || '').trim();
    const activityTo = (searchParams.get('activityTo') || '').trim();
    const sortParam = (searchParams.get('sort') || 'createdAt_desc').trim();

    const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1);
    const requestedLimit = Number.parseInt(limitParam || '10', 10) || 10;
    const allowedLimits = new Set([10, 20, 50]);
    const limit = allowedLimits.has(requestedLimit) ? requestedLimit : 10;
    const skip = (page - 1) * limit;

    const baseMatch: Record<string, unknown> = {};

    // Status filter
    if (status && status !== 'all') {
      // Accept both lowercase codes and title-case DB values
      const titleCase = status.charAt(0).toUpperCase() + status.slice(1);
      const mapped: Record<string, string> = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        refunded: 'Refunded',
        partial_refund: 'Partial_Refund',
        partial_refunded: 'Partial_Refund',
      };
      baseMatch.status = mapped[status.toLowerCase()] || titleCase;
    }

    // Tour filter
    if (tourIdParam && mongoose.Types.ObjectId.isValid(tourIdParam)) {
      baseMatch.tour = new mongoose.Types.ObjectId(tourIdParam);
    }

    // Date helpers
    const parseDayStartUtc = (dateStr: string): Date | null => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
      return new Date(`${dateStr}T00:00:00.000Z`);
    };
    const parseDayEndUtc = (dateStr: string): Date | null => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
      return new Date(`${dateStr}T23:59:59.999Z`);
    };

    // Purchase date range (createdAt)
    const createdAtFrom = parseDayStartUtc(purchaseFrom);
    const createdAtTo = parseDayEndUtc(purchaseTo);
    if (createdAtFrom || createdAtTo) {
      baseMatch.createdAt = {
        ...(createdAtFrom ? { $gte: createdAtFrom } : {}),
        ...(createdAtTo ? { $lte: createdAtTo } : {}),
      };
    }

    // Activity date range (tour date)
    const dateFrom = parseDayStartUtc(activityFrom);
    const dateTo = parseDayEndUtc(activityTo);
    if (dateFrom || dateTo) {
      baseMatch.date = {
        ...(dateFrom ? { $gte: dateFrom } : {}),
        ...(dateTo ? { $lte: dateTo } : {}),
      };
    }

    // Sort mapping
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      activityDate_desc: { date: -1 },
      activityDate_asc: { date: 1 },
    };
    const sortStage = sortMap[sortParam] || sortMap.createdAt_desc;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [
      { $match: baseMatch },
      // Join Tour
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: 'tour',
        },
      },
      { $unwind: { path: '$tour', preserveNullAndEmptyArrays: true } },
      // Join Destination
      {
        $lookup: {
          from: 'destinations',
          localField: 'tour.destination',
          foreignField: '_id',
          as: 'destination',
        },
      },
      { $unwind: { path: '$destination', preserveNullAndEmptyArrays: true } },
      // Join User
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Derived strings for search
      {
        $addFields: {
          idStr: { $toString: '$_id' },
        },
      },
    ];

    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      pipeline.push({
        $match: {
          $or: [
            { bookingReference: { $regex: regex } },
            { idStr: { $regex: regex } },
            { 'user.name': { $regex: regex } },
            { 'user.email': { $regex: regex } },
            { 'user.firstName': { $regex: regex } },
            { 'user.lastName': { $regex: regex } },
            { 'tour.title': { $regex: regex } },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: sortStage },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                bookingReference: 1,
                source: 1,
                date: 1,
                dateString: 1,
                time: 1,
                guests: 1,
                adultGuests: 1,
                childGuests: 1,
                infantGuests: 1,
                totalPrice: 1,
                currency: 1,
                status: 1,
                paymentMethod: 1,
                paymentStatus: 1,
                createdAt: 1,
                updatedAt: 1,
                tour: {
                  _id: '$tour._id',
                  title: '$tour.title',
                  image: '$tour.image',
                  duration: '$tour.duration',
                  destination: {
                    _id: '$destination._id',
                    name: '$destination.name',
                    slug: '$destination.slug',
                  },
                },
                user: {
                  _id: '$user._id',
                  name: '$user.name',
                  firstName: '$user.firstName',
                  lastName: '$user.lastName',
                  email: '$user.email',
                },
              },
            },
          ],
          meta: [{ $count: 'total' }],
        },
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = await (Booking as any).aggregate(pipeline).allowDiskUse(true);
    const data = result?.data || [];
    const total = result?.meta?.[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data,
      meta: { total, page, limit, totalPages },
    });
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json({ message: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST - Create manual booking
export async function POST(request: NextRequest) {
  // Verify admin authentication (cookie + Authorization header fallback)
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

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
      hotelPickupLocation,
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
      } catch (userError: unknown) {
        const err = userError as { code?: number };
        if (err?.code === 11000) {
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
    else if (payment?.method === 'pay_later') {
      return NextResponse.json(
        { error: 'Pay Later is currently unavailable. Please select another payment method.' },
        { status: 400 }
      );
    }

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
      currency: pricing?.currency || 'USD', // Include currency for manual bookings
      status: bookingStatus,
      paymentId: payment?.externalPaymentId || `MANUAL-${Date.now()}`,
      paymentMethod,
      specialRequests: specialRequests || undefined,
      hotelPickupDetails: hotelPickupDetails || undefined,
      hotelPickupLocation: hotelPickupLocation || undefined,
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const formatMoney = (value: number) => `$${value.toFixed(2)}`;

    // Build hotel pickup map URLs
    const hotelPickupMapImage = hotelPickupLocation ? buildStaticMapImageUrl(hotelPickupLocation) : undefined;
    const hotelPickupMapLink = hotelPickupLocation ? buildGoogleMapsLink(hotelPickupLocation) : undefined;

    // Calculate time until tour
    let timeUntilTour: { days: number; hours: number; minutes: number } | undefined;
    if (bookingDate) {
      const targetDate = new Date(bookingDate);
      if (bookingTime) {
        const [hours, minutes] = bookingTime.split(':').map(Number);
        if (!Number.isNaN(hours)) {
          targetDate.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
        }
      }
      const diff = targetDate.getTime() - Date.now();
      if (diff > 0) {
        timeUntilTour = {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        };
      }
    }

    // Build date badge
    let dateBadge: { dayLabel: string; dayNumber: number; monthLabel: string; year: number } | undefined;
    if (bookingDate) {
      const d = new Date(bookingDate);
      dateBadge = {
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNumber: d.getDate(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        year: d.getFullYear(),
      };
    }

    // Build ordered items for customer email
    const orderedItems = [{
      title: tour.title,
      image: tour.image,
      adults: booking.adultGuests || 1,
      children: booking.childGuests || 0,
      infants: booking.infantGuests || 0,
      bookingOption: booking.bookingOption?.title,
      totalPrice: formatMoney(pricing?.totalPrice || 0),
      quantity: booking.adultGuests || 1,
      childQuantity: booking.childGuests || 0,
      infantQuantity: booking.infantGuests || 0,
      price: booking.bookingOption?.price || 0,
      selectedBookingOption: booking.bookingOption || undefined,
    }];

    // Build pricing details
    const totalPrice = pricing?.totalPrice || 0;
    const pricingDetails = {
      subtotal: formatMoney(totalPrice * 0.92), // Approximate subtotal
      serviceFee: formatMoney(totalPrice * 0.03),
      tax: formatMoney(totalPrice * 0.05),
      total: formatMoney(totalPrice),
      currencySymbol: '$',
    };

    // Send confirmation email to customer
    try {
      await EmailService.sendBookingConfirmation({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tourTitle: tour.title,
        bookingDate: formatBookingDate(booking.date),
        bookingTime: bookingTime,
        participants: `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`,
        totalPrice: formatMoney(totalPrice),
        bookingId: bookingReference,
        bookingOption: booking.bookingOption?.title,
        specialRequests: specialRequests,
        hotelPickupDetails: hotelPickupDetails,
        hotelPickupLocation: hotelPickupLocation || undefined,
        hotelPickupMapImage: hotelPickupMapImage || undefined,
        hotelPickupMapLink: hotelPickupMapLink || undefined,
        meetingPoint: tour.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
        contactNumber: "+20 11 42255624",
        tourImage: tour.image,
        baseUrl,
        orderedItems,
        pricingDetails,
        timeUntil: timeUntilTour,
        dateBadge,
      });
      console.log(`[Manual Booking] Sent confirmation email to ${customer.email}`);
    } catch (emailError) {
      console.error('[Manual Booking] Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Build tours array for admin alert
    const tourDetails = [{
      title: tour.title,
      date: formatBookingDate(booking.date),
      time: bookingTime,
      adults: booking.adultGuests || 1,
      children: booking.childGuests || 0,
      infants: booking.infantGuests || 0,
      bookingOption: booking.bookingOption?.title,
      price: formatMoney(pricing?.totalPrice || 0),
    }];

    // Send admin alert
    try {
      await EmailService.sendAdminBookingAlert({
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        tourTitle: tour.title,
        bookingId: bookingReference,
        bookingDate: formatBookingDate(booking.date),
        totalPrice: formatMoney(totalPrice),
        paymentMethod: `${paymentMethod} (Manual Entry)`,
        specialRequests: specialRequests,
        hotelPickupDetails: hotelPickupDetails,
        hotelPickupLocation: hotelPickupLocation || undefined,
        hotelPickupMapImage: hotelPickupMapImage || undefined,
        hotelPickupMapLink: hotelPickupMapLink || undefined,
        tours: tourDetails,
        timeUntil: timeUntilTour,
        dateBadge,
        adminDashboardLink: baseUrl ? `${baseUrl}/admin/bookings/${bookingReference}` : undefined,
        baseUrl,
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

  } catch (error: unknown) {
    console.error('[Manual Booking] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 }
    );
  }
}