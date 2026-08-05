// app/api/admin/bookings/route.ts
import { withAdminAudit } from '@/lib/admin/adminAudit';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import mongoose from 'mongoose';
import { EmailService } from '@/lib/email/emailService';
import { parseLocalDate, ensureDateOnlyString } from '@/utils/date';
import { buildGoogleMapsLink, buildStaticMapImageUrl } from '@/lib/utils/mapImage';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { requireAdminAuth } from '@/lib/auth/adminAuth';
import { resolveEffectivePrice, STANDARD_OPTION_KEY } from '@/lib/revenue/pricingResolver';
import { assertRevenuePriceTargetSellable } from '@/lib/revenue/sellableDeparture';
import { roundMoney } from '@/lib/checkout/cartTotals';
import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import {
  createInventoryHolds,
  InventoryHoldError,
  releaseInventoryHolds,
} from '@/lib/checkout/inventoryHolds';
import { finalizeManualBookingInventory } from '@/lib/checkout/manualBookingInventory';
import {
  normalizeBoundedText,
  normalizeEmail,
  PublicInputError,
  readBoundedJson,
} from '@/lib/security/publicInput';
import { generateUniqueBookingReference } from '@/lib/utils/bookingReference';

let stripeInstance: Stripe | null = null;

function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
  }
  return stripeInstance;
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

// Never edge/CDN-cache the admin bookings list — it must reflect deletes/edits
// immediately (a cached page was making just-deleted bookings reappear).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const baseMatch: Record<string, unknown> = {
      // Only show bookings from the EEO network (no tenantId or default tenant)
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' },
        { tenantId: 'default' },
      ],
    };

    // Status filter
    if (status && status !== 'all') {
      // Accept both lowercase codes and title-case DB values
      const titleCase = status.charAt(0).toUpperCase() + status.slice(1);
      const mapped: Record<string, string> = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        completed: 'Completed',
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
async function POSTHandler(request: NextRequest) {
  // Verify admin authentication (cookie + Authorization header fallback)
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  await dbConnect();

  let inventoryReservationKey: string | undefined;
  let manualCreatedBookingId: mongoose.Types.ObjectId | undefined;
  let manualCreatedBookingReference: string | undefined;
  try {
    const body = await readBoundedJson<Record<string, unknown>>(request, 32_768);
    const {
      tourId,
      customer,
      booking,
      pricing,
      payment,
      specialRequests,
      hotelPickupDetails,
      hotelPickupLocation,
      pickupLocation,
      pickupAddress,
      internalNotes,
      sendEmail,
    } = body;

    if (sendEmail !== undefined && typeof sendEmail !== 'boolean') {
      return NextResponse.json({ error: 'sendEmail must be true or false.' }, { status: 400 });
    }
    const sendCustomerEmail = sendEmail !== false;

    const rawCustomer = customer as Record<string, unknown> | undefined;
    const rawBooking = booking as Record<string, unknown> | undefined;
    const rawPricing = pricing as Record<string, unknown> | undefined;
    const rawPayment = payment as Record<string, unknown> | undefined;
    const normalizedCustomer = {
      firstName: normalizeBoundedText(rawCustomer?.firstName, { minimum: 1, maximum: 80 }),
      lastName: normalizeBoundedText(rawCustomer?.lastName, { minimum: 1, maximum: 80 }),
      email: normalizeEmail(rawCustomer?.email),
      phone: normalizeBoundedText(rawCustomer?.phone, { minimum: 1, maximum: 50 }),
      country: normalizeBoundedText(rawCustomer?.country, { minimum: 1, maximum: 100 }),
    };
    const normalizedSpecialRequests = specialRequests === undefined
      ? undefined
      : normalizeBoundedText(specialRequests, { minimum: 1, maximum: 1_000, collapseWhitespace: false });
    const normalizedHotelPickupDetails = hotelPickupDetails === undefined
      ? undefined
      : normalizeBoundedText(hotelPickupDetails, { minimum: 1, maximum: 300, collapseWhitespace: false });
    const normalizedPickupLocation = pickupLocation === undefined
      ? undefined
      : normalizeBoundedText(pickupLocation, { minimum: 1, maximum: 200 });
    const normalizedPickupAddress = pickupAddress === undefined
      ? undefined
      : normalizeBoundedText(pickupAddress, { minimum: 1, maximum: 300, collapseWhitespace: false });
    const normalizedInternalNotes = internalNotes === undefined
      ? undefined
      : normalizeBoundedText(internalNotes, { minimum: 1, maximum: 2_000, collapseWhitespace: false });
    if ((specialRequests !== undefined && !normalizedSpecialRequests)
      || (hotelPickupDetails !== undefined && !normalizedHotelPickupDetails)
      || (pickupLocation !== undefined && !normalizedPickupLocation)
      || (pickupAddress !== undefined && !normalizedPickupAddress)
      || (internalNotes !== undefined && !normalizedInternalNotes)) {
      return NextResponse.json({ error: 'One or more booking detail fields are invalid or too long.' }, { status: 400 });
    }
    let normalizedHotelPickupLocation: {
      address: string;
      lat: number;
      lng: number;
      placeId?: string;
      name?: string;
    } | undefined;
    if (hotelPickupLocation !== undefined && hotelPickupLocation !== null) {
      if (typeof hotelPickupLocation !== 'object' || Array.isArray(hotelPickupLocation)) {
        return NextResponse.json({ error: 'Hotel pickup location is invalid.' }, { status: 400 });
      }
      const rawLocation = hotelPickupLocation as Record<string, unknown>;
      const lat = Number(rawLocation.lat);
      const lng = Number(rawLocation.lng);
      const address = normalizeBoundedText(rawLocation.address, { minimum: 1, maximum: 300, collapseWhitespace: false });
      const name = rawLocation.name === undefined
        ? undefined
        : normalizeBoundedText(rawLocation.name, { minimum: 1, maximum: 200 });
      const placeId = rawLocation.placeId === undefined
        ? undefined
        : normalizeBoundedText(rawLocation.placeId, { minimum: 1, maximum: 200 });
      if (!address || !Number.isFinite(lat) || lat < -90 || lat > 90
        || !Number.isFinite(lng) || lng < -180 || lng > 180
        || (rawLocation.name !== undefined && !name)
        || (rawLocation.placeId !== undefined && !placeId)) {
        return NextResponse.json({ error: 'Hotel pickup location is invalid.' }, { status: 400 });
      }
      normalizedHotelPickupLocation = { address, lat, lng, name: name || undefined, placeId: placeId || undefined };
    }

    // Validate required fields
    if (typeof tourId !== 'string' || !mongoose.Types.ObjectId.isValid(tourId)) {
      return NextResponse.json({ error: 'Tour ID is required' }, { status: 400 });
    }

    if (!normalizedCustomer.email || !normalizedCustomer.firstName || !normalizedCustomer.lastName) {
      return NextResponse.json({ error: 'Customer details are required' }, { status: 400 });
    }

    if (!rawBooking?.date) {
      return NextResponse.json({ error: 'Booking date is required' }, { status: 400 });
    }

    // Verify tour exists
    const tour = await Tour.findOne({ _id: tourId, ...DEFAULT_TENANT_FILTER });
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    const bookingDateString = ensureDateOnlyString(rawBooking.date as string | Date | undefined);
    const bookingDate = parseLocalDate(rawBooking.date as string | Date | undefined);
    const bookingTime = String(rawBooking.time || '');
    if (!bookingDate || !bookingDateString || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(bookingTime)) {
      return NextResponse.json({ error: 'A valid departure date and time are required.' }, { status: 400 });
    }

    const adultGuests = Number(rawBooking.adultGuests ?? 1);
    const childGuests = Number(rawBooking.childGuests ?? 0);
    const infantGuests = Number(rawBooking.infantGuests ?? 0);
    const counts = [adultGuests, childGuests, infantGuests];
    const totalGuests = counts.reduce((sum, count) => sum + count, 0);
    if (counts.some((count) => !Number.isInteger(count) || count < 0) || totalGuests < 1 || totalGuests > 50) {
      return NextResponse.json({ error: 'Guest counts must be whole numbers with 1 to 50 guests in total.' }, { status: 400 });
    }

    const rawBookingOption = rawBooking.bookingOption as Record<string, unknown> | undefined;
    const requestedOptionKey = String(rawBookingOption?.pricingKey || rawBookingOption?.id || STANDARD_OPTION_KEY);
    const optionIndex = requestedOptionKey === STANDARD_OPTION_KEY
      ? -1
      : (tour.bookingOptions || []).findIndex((option) => option.pricingKey === requestedOptionKey);
    if (requestedOptionKey !== STANDARD_OPTION_KEY && optionIndex < 0) {
      return NextResponse.json({ error: 'The selected booking option is no longer available.' }, { status: 409 });
    }

    let quote;
    let sellability;
    try {
      quote = await resolveEffectivePrice({
        tourId: String(tour._id), optionKey: requestedOptionKey, date: bookingDateString, time: bookingTime,
      });
      sellability = await assertRevenuePriceTargetSellable({
        tourId: String(tour._id), optionKey: requestedOptionKey, date: bookingDateString, time: bookingTime,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'The selected departure is unavailable.' },
        { status: 409 },
      );
    }
    const requestedQuoteVersion = Number(rawPricing?.quoteVersion);
    if (!Number.isInteger(requestedQuoteVersion) || requestedQuoteVersion !== quote.version) {
      return NextResponse.json({
        error: 'The selected price changed. Review the refreshed quote before creating the booking.',
        code: 'PRICE_CHANGED',
        quote,
      }, { status: 409 });
    }
    if (totalGuests > sellability.available) {
      return NextResponse.json({ error: 'The selected departure no longer has enough capacity.' }, { status: 409 });
    }

    const customPrice = rawPricing?.customPrice === true;
    if (customPrice) {
      const pricingAuth = await requireAdminAuth(request, { permissions: ['manageBookings', 'managePricing'] });
      if (pricingAuth instanceof NextResponse) return pricingAuth;
    }

    const quotedSubtotal = roundMoney(
      quote.prices.adult * adultGuests
      + quote.prices.child * childGuests
      + quote.prices.infant * infantGuests,
    );
    const quotedServiceFee = roundMoney(quotedSubtotal * 0.03);
    const quotedTax = roundMoney(quotedSubtotal * 0.05);
    const quotedTotal = roundMoney(quotedSubtotal + quotedServiceFee + quotedTax);
    const requestedCustomTotal = Number(rawPricing?.totalPrice);
    const maximumManualTotal = Number(process.env.MAX_MANUAL_BOOKING_TOTAL_USD || 100_000);
    if (customPrice && (!Number.isFinite(requestedCustomTotal) || requestedCustomTotal < 0 || requestedCustomTotal > maximumManualTotal)) {
      return NextResponse.json({ error: `Custom total must be between $0 and $${maximumManualTotal.toLocaleString()}.` }, { status: 422 });
    }
    const priceBreakdown = customPrice
      ? { subtotal: roundMoney(requestedCustomTotal), serviceFee: 0, tax: 0, total: roundMoney(requestedCustomTotal) }
      : { subtotal: quotedSubtotal, serviceFee: quotedServiceFee, tax: quotedTax, total: quotedTotal };

    const selectedCatalogueOption = optionIndex >= 0 ? tour.bookingOptions?.[optionIndex] : undefined;
    const selectedBookingOption = {
      id: optionIndex >= 0 ? `option-${optionIndex}` : 'standard-default',
      pricingKey: requestedOptionKey,
      title: selectedCatalogueOption?.label || `${tour.title} - Standard Experience`,
      price: quote.prices.adult,
      originalPrice: selectedCatalogueOption?.originalPrice || tour.originalPrice || quote.prices.adult,
      duration: selectedCatalogueOption?.duration || tour.duration,
      badge: selectedCatalogueOption?.badge,
    };

    // Determine status based on payment
    if (!['paid', 'pending'].includes(String(rawPayment?.status || ''))) {
      return NextResponse.json({ error: 'Payment status must be paid or pending.' }, { status: 400 });
    }
    const bookingStatus = rawPayment?.status === 'paid' ? 'Confirmed' : 'Pending';

    // Determine payment method
    let paymentMethod = 'card';
    if (rawPayment?.method === 'cash') paymentMethod = 'cash';
    else if (rawPayment?.method === 'bank') paymentMethod = 'bank';
    else if (rawPayment?.method === 'pay_later') {
      return NextResponse.json(
        { error: 'Pay Later is currently unavailable. Please select another payment method.' },
        { status: 400 }
      );
    } else if (rawPayment?.method !== 'card') {
      return NextResponse.json({ error: 'Payment method must be cash, bank, or card.' }, { status: 400 });
    }

    const paymentId = String(rawPayment?.externalPaymentId || '').trim();
    if (paymentMethod === 'card' && bookingStatus !== 'Confirmed') {
      return NextResponse.json(
        { error: 'Pending card bookings must be created through Stripe checkout so the webhook can confirm them.' },
        { status: 400 },
      );
    }
    if (paymentMethod === 'card' && bookingStatus === 'Confirmed') {
      if (!/^pi_[A-Za-z0-9_]+$/.test(paymentId)) {
        return NextResponse.json({ error: 'A valid successful Stripe PaymentIntent is required for a paid card booking.' }, { status: 400 });
      }
      const intent = await getStripe().paymentIntents.retrieve(paymentId);
      if (intent.status !== 'succeeded'
        || intent.currency.toUpperCase() !== quote.currency.toUpperCase()
        || intent.amount !== Math.round(priceBreakdown.total * 100)) {
        return NextResponse.json({ error: 'Stripe payment status, currency, or amount does not match this booking.' }, { status: 409 });
      }
      if (await Booking.exists({ paymentId, ...DEFAULT_TENANT_FILTER })) {
        return NextResponse.json({ error: 'This Stripe payment is already linked to a booking.' }, { status: 409 });
      }
    }

    // Serialize every manual booking against storefront checkouts for the same
    // departure. The hold becomes durable capacity as soon as the Booking row
    // is created, and is released automatically on any pre-create failure.
    inventoryReservationKey = randomBytes(32).toString('hex');
    await createInventoryHolds({
      reservationKey: inventoryReservationKey,
      cart: [{
        _id: String(tour._id),
        selectedDate: bookingDateString,
        selectedTime: bookingTime,
        quantity: adultGuests,
        childQuantity: childGuests,
        infantQuantity: infantGuests,
        selectedBookingOption: { pricingKey: requestedOptionKey },
      }],
    });

    // Validate the full booking before creating a customer record so rejected
    // requests do not leave orphan guest users behind.
    const normalizedEmail = normalizedCustomer.email;
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      try {
        user = await User.create({
          firstName: normalizedCustomer.firstName,
          lastName: normalizedCustomer.lastName,
          email: normalizedEmail,
          phone: normalizedCustomer.phone,
          country: normalizedCustomer.country,
          role: 'customer',
          permissions: [],
          isGuestProfile: true,
        });
      } catch (userError: unknown) {
        const err = userError as { code?: number };
        if (err?.code === 11000) user = await User.findOne({ email: normalizedEmail });
        else throw userError;
      }
    }
    if (!user) return NextResponse.json({ error: 'Failed to create or find user' }, { status: 500 });

    // Generate booking reference
    const bookingReference = await generateUniqueBookingReference();

    // Create booking
    const newBooking = await Booking.create({
      tenantId: 'default',
      bookingReference,
      tour: tour._id,
      user: user._id,
      date: bookingDate,
      dateString: bookingDateString,
      time: bookingTime,
      guests: totalGuests,
      totalPrice: priceBreakdown.total,
      currency: quote.currency,
      status: bookingStatus,
      source: 'manual',
      paymentStatus: bookingStatus === 'Confirmed' ? 'paid' : 'pending',
      amountPaid: bookingStatus === 'Confirmed' ? priceBreakdown.total : 0,
      paymentConfirmedAt: bookingStatus === 'Confirmed' ? new Date() : undefined,
      paymentConfirmedBy: bookingStatus === 'Confirmed' ? `admin:${auth.id}` : undefined,
      inventoryReservationState: 'pending_conversion',
      paymentId: paymentId || `MANUAL-${randomBytes(12).toString('hex')}`,
      paymentItemIndex: 0,
      paymentMethod,
      customerPhone: normalizedCustomer.phone,
      customerCountry: normalizedCustomer.country,
      specialRequests: normalizedSpecialRequests,
      hotelPickupDetails: normalizedHotelPickupDetails,
      hotelPickupLocation: normalizedHotelPickupLocation,
      pickupLocation: normalizedPickupLocation,
      pickupAddress: normalizedPickupAddress,
      internalNotes: normalizedInternalNotes,
      adultGuests,
      childGuests,
      infantGuests,
      selectedBookingOption,
      priceSnapshot: {
        guestPrices: quote.prices,
        version: quote.version,
        executionId: quote.executionId || undefined,
        overrideId: quote.overrideId || undefined,
        capturedAt: new Date(),
        source: customPrice ? 'manual' : quote.source,
      },
      // Add edit history entry for manual creation
      editHistory: [{
        editedAt: new Date(),
        editedBy: auth.id,
        editedByName: auth.email || auth.name || 'Admin (Manual)',
        field: 'created',
        previousValue: 'N/A',
        newValue: customPrice ? 'Manual booking created with authorized custom total' : 'Manual booking created from authoritative quote',
        changeType: 'detail_update',
      }],
    });
    manualCreatedBookingId = new mongoose.Types.ObjectId(String(newBooking._id));
    manualCreatedBookingReference = bookingReference;
    const inventoryFinalizationState = await finalizeManualBookingInventory({
      reservationKey: inventoryReservationKey,
      bookingId: manualCreatedBookingId,
    });
    inventoryReservationKey = undefined;
    manualCreatedBookingId = undefined;
    manualCreatedBookingReference = undefined;

    console.log(`[Manual Booking] Created booking ${bookingReference}`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const formatMoney = (value: number) => `$${value.toFixed(2)}`;

    // Build hotel pickup map URLs
    const hotelPickupMapImage = normalizedHotelPickupLocation ? buildStaticMapImageUrl(normalizedHotelPickupLocation) : undefined;
    const hotelPickupMapLink = normalizedHotelPickupLocation ? buildGoogleMapsLink(normalizedHotelPickupLocation) : undefined;

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
      adults: adultGuests,
      children: childGuests,
      infants: infantGuests,
      bookingOption: selectedBookingOption.title,
      totalPrice: formatMoney(priceBreakdown.total),
      quantity: adultGuests,
      childQuantity: childGuests,
      infantQuantity: infantGuests,
      price: quote.prices.adult,
      selectedBookingOption,
    }];

    // Build pricing details
    const totalPrice = priceBreakdown.total;
    const pricingDetails = {
      subtotal: formatMoney(priceBreakdown.subtotal),
      serviceFee: formatMoney(priceBreakdown.serviceFee),
      tax: formatMoney(priceBreakdown.tax),
      total: formatMoney(totalPrice),
      currencySymbol: '$',
    };

    // Send confirmation email to customer
    if (sendCustomerEmail) try {
      await EmailService.sendBookingConfirmation({
        customerName: `${normalizedCustomer.firstName} ${normalizedCustomer.lastName}`,
        customerEmail: normalizedCustomer.email,
        customerPhone: normalizedCustomer.phone || undefined,
        tourTitle: tour.title,
        bookingDate: formatBookingDate(bookingDate),
        bookingTime: bookingTime,
        participants: `${totalGuests} participant${totalGuests !== 1 ? 's' : ''}`,
        totalPrice: formatMoney(totalPrice),
        bookingId: bookingReference,
        bookingOption: selectedBookingOption.title,
        specialRequests: normalizedSpecialRequests || undefined,
        hotelPickupDetails: normalizedHotelPickupDetails || undefined,
        hotelPickupLocation: normalizedHotelPickupLocation,
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
      console.log('[Manual Booking] Sent confirmation email');
      await Booking.updateOne(
        { _id: newBooking._id },
        { $set: { confirmationSentAt: new Date() }, $unset: { confirmationEmailFailedAt: 1, confirmationEmailFailureCode: 1 } },
      ).catch(() => undefined);
    } catch (emailError) {
      console.error('[Manual Booking] Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails — record it for the admin UI.
      const failureCode = (emailError instanceof Error ? emailError.message : 'unknown_error').slice(0, 200);
      await Booking.updateOne(
        { _id: newBooking._id },
        { $set: { confirmationEmailFailedAt: new Date(), confirmationEmailFailureCode: failureCode } },
      ).catch(() => undefined);
    }

    // Build tours array for admin alert
    const tourDetails = [{
      title: tour.title,
      date: formatBookingDate(bookingDate),
      time: bookingTime,
      adults: adultGuests,
      children: childGuests,
      infants: infantGuests,
      bookingOption: selectedBookingOption.title,
      price: formatMoney(totalPrice),
    }];

    // Send admin alert
    try {
      await EmailService.sendAdminBookingAlert({
        customerName: `${normalizedCustomer.firstName} ${normalizedCustomer.lastName}`,
        customerEmail: normalizedCustomer.email,
        customerPhone: normalizedCustomer.phone || undefined,
        tourTitle: tour.title,
        bookingId: bookingReference,
        bookingDate: formatBookingDate(bookingDate),
        totalPrice: formatMoney(totalPrice),
        paymentMethod: `${paymentMethod} (Manual Entry)`,
        specialRequests: normalizedSpecialRequests || undefined,
        hotelPickupDetails: normalizedHotelPickupDetails || undefined,
        hotelPickupLocation: normalizedHotelPickupLocation,
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
      inventoryReservationState: inventoryFinalizationState,
    });

  } catch (error: unknown) {
    console.error('[Manual Booking] Error:', error);
    if (inventoryReservationKey) {
      await releaseInventoryHolds({ reservationKey: inventoryReservationKey, reason: 'manual_booking_failed' }).catch(() => undefined);
      if (manualCreatedBookingId) {
        await Booking.updateOne(
          { _id: manualCreatedBookingId, tenantId: 'default' },
          {
            $set: {
              inventoryReservationState: 'booking_authoritative',
              inventoryReservationFailureCode: 'MANUAL_BOOKING_POST_CREATE_RECOVERY',
              inventoryReservationFinalizedAt: new Date(),
            },
          },
        ).catch(() => undefined);
        return NextResponse.json({
          success: true,
          message: 'Booking created; inventory is protected by the durable booking record.',
          bookingId: String(manualCreatedBookingId),
          bookingReference: manualCreatedBookingReference,
          inventoryReservationState: 'booking_authoritative',
        }, { status: 201 });
      }
    }
    if (error instanceof InventoryHoldError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof PublicInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: 'This payment or booking request has already been recorded.', code: 'DUPLICATE_BOOKING' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export const POST = withAdminAudit(POSTHandler);
