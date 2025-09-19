// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { sendBookingConfirmation, sendBookingNotificationToAdmin } from '@/lib/mailgun';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      customer, 
      cart, 
      pricing, 
      paymentMethod = 'card',
      paymentDetails,
      userId,
      isGuest = false
    } = body;

    // Validate required data
    if (!customer || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Validate customer information
    if (!customer.firstName || !customer.lastName || !customer.email) {
      return NextResponse.json(
        { success: false, message: 'Customer information is incomplete' },
        { status: 400 }
      );
    }

    let user = null;

    // Handle user creation for guest checkout or find existing user
    if (isGuest) {
      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: customer.email });
      
      if (existingUser) {
        user = existingUser;
      } else {
        // Create a new user account for guest (they can claim it later)
        try {
          user = await User.create({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            password: 'guest-' + Math.random().toString(36).substring(2, 15), // Temporary password
          });
        } catch (userError: any) {
          if (userError.code === 11000) {
            // Email already exists, find the user
            user = await User.findOne({ email: customer.email });
          } else {
            throw userError;
          }
        }
      }
    } else if (userId) {
      // User is authenticated
      user = await User.findById(userId);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unable to process user information' },
        { status: 400 }
      );
    }

    // Mock payment processing (replace with real payment provider)
    const mockPaymentProcessing = async () => {
      // Simulate payment processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate 95% success rate for demo purposes
      const isPaymentSuccessful = Math.random() > 0.05;
      
      if (!isPaymentSuccessful) {
        throw new Error('Payment processing failed. Please try a different payment method.');
      }

      return {
        paymentId: `mock_payment_${Date.now()}`,
        status: 'completed',
        amount: pricing.total,
        currency: pricing.currency || 'USD',
      };
    };

    // Process payment
    const paymentResult = await mockPaymentProcessing();

    // Create bookings for each cart item
    const createdBookings = [];
    
    for (const cartItem of cart) {
      try {
        // Verify tour exists
        const tour = await Tour.findById(cartItem._id || cartItem.id);
        if (!tour) {
          throw new Error(`Tour not found: ${cartItem.title}`);
        }

        // Parse booking date and time
        const bookingDate = new Date(cartItem.selectedDate);
        const bookingTime = cartItem.selectedTime || '10:00';

        // Calculate total guests
        const totalGuests = (cartItem.quantity || 1) + (cartItem.childQuantity || 0) + (cartItem.infantQuantity || 0);

        // Create booking
        const booking = await Booking.create({
          tour: tour._id,
          user: user._id,
          date: bookingDate,
          time: bookingTime,
          guests: totalGuests,
          totalPrice: cartItem.totalPrice || cartItem.discountPrice || cartItem.price || 0,
          status: 'Confirmed',
          paymentId: paymentResult.paymentId,
          paymentMethod,
          specialRequests: customer.specialRequests,
          emergencyContact: customer.emergencyContact,
          // Store additional cart item details
          adultGuests: cartItem.quantity || 1,
          childGuests: cartItem.childQuantity || 0,
          infantGuests: cartItem.infantQuantity || 0,
          selectedAddOns: cartItem.selectedAddOns || {},
        });

        createdBookings.push(booking);
      } catch (bookingError: any) {
        console.error('Error creating booking:', bookingError);
        throw new Error(`Failed to create booking for ${cartItem.title}: ${bookingError.message}`);
      }
    }

    // Generate booking confirmation data
    const mainBooking = createdBookings[0];
    const mainTour = await Tour.findById(mainBooking.tour);
    
    const bookingConfirmationData = {
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
      bookingDate: mainBooking.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      bookingTime: mainBooking.time,
      participants: `${mainBooking.guests} participant${mainBooking.guests !== 1 ? 's' : ''}`,
      totalPrice: `$${pricing.total.toFixed(2)}`,
      bookingId: createdBookings.length === 1 ? mainBooking._id.toString() : `MULTI-${Date.now()}`,
      specialRequests: customer.specialRequests,
    };

    // Send confirmation email to customer
    try {
      await sendBookingConfirmation(bookingConfirmationData);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Send notification to admin
    try {
      await sendBookingNotificationToAdmin(bookingConfirmationData);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the booking if admin notification fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking completed successfully!',
      bookingId: bookingConfirmationData.bookingId,
      bookings: createdBookings.map(booking => booking._id),
      paymentId: paymentResult.paymentId,
      customer: {
        name: bookingConfirmationData.customerName,
        email: bookingConfirmationData.customerEmail,
      },
      ...(isGuest && { 
        guestAccount: true,
        message: 'Booking completed! A temporary account has been created with your email. You can set a password later to access your bookings.',
      }),
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    
    // Handle specific error types
    if (error.message.includes('Payment processing failed')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 402 }
      );
    }

    if (error.message.includes('Tour not found')) {
      return NextResponse.json(
        { success: false, message: 'One or more tours in your cart are no longer available' },
        { status: 404 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { 
        success: false, 
        message: 'Booking failed due to a server error. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// GET method for retrieving checkout session (optional)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // In a real implementation, you'd retrieve the session from your payment provider
    // For now, we'll return a mock response
    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        status: 'completed',
        payment_status: 'paid',
      },
    });

  } catch (error: any) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}