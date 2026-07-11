import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking, { type IBooking } from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { generateReceiptPdf } from '@/lib/utils/generateReceiptPdf';
import { formatBookingDate } from '@/lib/utils/receiptDate';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import type { PopulatedBookingTour, PopulatedBookingUser } from '@/lib/types/populatedBooking';

type ReceiptBookingRecord = Omit<IBooking, 'tour' | 'user'> & {
  tour: PopulatedBookingTour;
  user: PopulatedBookingUser;
};

export async function POST(request: NextRequest) {
  try {
    const { receiptToken } = await request.json();
    if (!receiptToken || typeof receiptToken !== 'string') {
      return NextResponse.json({ error: 'Receipt authorization required' }, { status: 401 });
    }

    const payload = await verifyToken(receiptToken);
    if (!payload || payload.scope !== 'receipt' || !payload.paymentId || payload.sub !== `receipt:${payload.paymentId}`) {
      return NextResponse.json({ error: 'Invalid or expired receipt authorization' }, { status: 401 });
    }

    await dbConnect();
    const bookings = await Booking.find({
      paymentId: String(payload.paymentId),
      ...DEFAULT_TENANT_FILTER,
    })
      .populate({ path: 'tour', model: Tour, select: 'title' })
      .populate({ path: 'user', model: User, select: 'firstName lastName email phone' })
      .sort({ createdAt: 1 })
      .lean() as unknown as ReceiptBookingRecord[];

    if (bookings.length === 0) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    const first = bookings[0];
    const user = first.user || {};
    const total = bookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
    const orderId = bookings.length === 1
      ? first.bookingReference
      : `PAYMENT-${String(payload.paymentId).slice(-10).toUpperCase()}`;

    const pdfBuffer = await generateReceiptPdf({
      orderId,
      customer: {
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        email: user.email,
        phone: user.phone,
      },
      orderedItems: bookings.map((booking) => ({
        title: booking.tour?.title || 'Tour booking',
        quantity: booking.adultGuests || booking.guests || 1,
        childQuantity: booking.childGuests || 0,
        infantQuantity: booking.infantGuests || 0,
        totalPrice: booking.totalPrice,
        selectedBookingOption: booking.selectedBookingOption,
        selectedAddOns: booking.selectedAddOns,
        selectedAddOnDetails: booking.selectedAddOnDetails,
      })),
      pricing: { total, currency: first.currency || 'USD', symbol: '$' },
      booking: {
        date: formatBookingDate(first.date),
        time: first.time,
        guests: bookings.reduce((sum, booking) => sum + Number(booking.guests || 0), 0),
        specialRequests: first.specialRequests,
      },
      qrData: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/booking/verify/${first.bookingReference}`,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${orderId}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    console.error('Receipt generation failed');
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 });
  }
}
