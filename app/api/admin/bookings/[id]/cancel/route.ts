// app/api/bookings/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { verifyToken } from '@/lib/jwt';
import { EmailService } from '@/lib/email/emailService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    // Verify user authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedPayload = await verifyToken(token);

    if (!decodedPayload || !decodedPayload.sub) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedPayload.sub as string;
    const { id: bookingId } = await params;

    // Find the booking
    const booking = await Booking.findById(bookingId).populate([
      { path: 'tour', model: Tour },
      { path: 'user', model: User }
    ]);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const user = booking.user as any;
    const tour = booking.tour as any;

    // Verify ownership
    if (user._id.toString() !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if already cancelled
    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    // Get cancellation reason from request body
    const { reason } = await request.json();

    // Calculate refund (simple logic - you can enhance this)
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const daysUntilTour = Math.ceil((bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let refundPercentage = 0;
    if (daysUntilTour >= 7) refundPercentage = 100;
    else if (daysUntilTour >= 3) refundPercentage = 50;
    else refundPercentage = 0;

    const refundAmount = (booking.totalPrice * refundPercentage) / 100;

    // Update booking status
    booking.status = 'Cancelled';
    await booking.save();

    // 🆕 Send Cancellation Confirmation Email
    try {
      await EmailService.sendCancellationConfirmation({
        customerName: `${user.firstName} ${user.lastName}`,
        customerEmail: user.email,
        tourTitle: tour.title,
        bookingDate: booking.date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        bookingId: (booking._id as any).toString(),
        refundAmount: refundAmount > 0 ? `$${refundAmount.toFixed(2)}` : undefined,
        refundProcessingDays: refundAmount > 0 ? 5 : undefined,
        cancellationReason: reason,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || ''
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the cancellation if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount: refundAmount,
      refundPercentage: refundPercentage
    });

  } catch (error: any) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}