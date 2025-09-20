// app/api/checkout/route.ts (Updated with better error handling)
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Booking from '@/lib/models/Booking';
import Tour from '@/lib/models/Tour';
import User from '@/lib/models/user';
import { EmailService } from '@/lib/email/emailService';

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

    // Validation (keep existing)
    if (!customer || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking information' },
        { status: 400 }
      );
    }

    if (!customer.firstName || !customer.lastName || !customer.email) {
      return NextResponse.json(
        { success: false, message: 'Customer information is incomplete' },
        { status: 400 }
      );
    }

    let user = null;

    // Handle user creation (keep existing logic)
    if (isGuest) {
      const existingUser = await User.findOne({ email: customer.email });
      
      if (existingUser) {
        user = existingUser;
      } else {
        try {
          user = await User.create({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            password: 'guest-' + Math.random().toString(36).substring(2, 15),
          });
          
          // Send Welcome Email for New Guest Users
          await EmailService.sendWelcomeEmail({
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email,
            dashboardLink: `${process.env.NEXT_PUBLIC_BASE_URL}/user/dashboard`,
            recommendedTours: [
              {
                title: "Pyramids of Giza Tour",
                image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/pyramids.jpg`,
                price: "$49",
                link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/pyramids-giza`
              },
              {
                title: "Nile River Cruise",
                image: `${process.env.NEXT_PUBLIC_BASE_URL}/images/nile.jpg`,
                price: "$89",
                link: `${process.env.NEXT_PUBLIC_BASE_URL}/tour/nile-cruise`
              }
            ]
          });
        } catch (userError: any) {
          if (userError.code === 11000) {
            user = await User.findOne({ email: customer.email });
          } else {
            throw userError;
          }
        }
      }
    } else if (userId) {
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

    // Mock payment processing (keep existing)
    const mockPaymentProcessing = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Send Payment Confirmation
    await EmailService.sendPaymentConfirmation({
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      paymentId: paymentResult.paymentId,
      paymentMethod: paymentMethod,
      amount: `$${pricing.total.toFixed(2)}`,
      currency: paymentResult.currency,
      bookingId: `BOOKING-${Date.now()}`,
      tourTitle: cart.length === 1 ? cart[0].title : `${cart.length} Tours`
    });

    // Create bookings with improved error handling
    const createdBookings = [];
    
    for (let i = 0; i < cart.length; i++) {
      const cartItem = cart[i];
      try {
        const tour = await Tour.findById(cartItem._id || cartItem.id);
        if (!tour) {
          throw new Error(`Tour not found: ${cartItem.title}`);
        }

        const bookingDate = new Date(cartItem.selectedDate);
        const bookingTime = cartItem.selectedTime || '10:00';
        const totalGuests = (cartItem.quantity || 1) + (cartItem.childQuantity || 0) + (cartItem.infantQuantity || 0);

        // Generate a unique booking reference before creating
        const bookingReference = await Booking.generateUniqueReference();

        const booking = await Booking.create({
          bookingReference, // Explicitly set the booking reference
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
          adultGuests: cartItem.quantity || 1,
          childGuests: cartItem.childQuantity || 0,
          infantGuests: cartItem.infantQuantity || 0,
          selectedAddOns: cartItem.selectedAddOns || {},
        });

        createdBookings.push(booking);
        
        // Add a small delay between bookings to avoid rapid succession issues
        if (i < cart.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (bookingError: any) {
        console.error('Error creating booking:', bookingError);
        
        // If it's a duplicate key error, try once more with a different approach
        if (bookingError.code === 11000 && bookingError.message.includes('bookingReference')) {
          try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const fallbackReference = `EEO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            const booking = await Booking.create({
              bookingReference: fallbackReference,
              tour: (await Tour.findById(cartItem._id || cartItem.id))?._id,
              user: user._id,
              date: new Date(cartItem.selectedDate),
              time: cartItem.selectedTime || '10:00',
              guests: (cartItem.quantity || 1) + (cartItem.childQuantity || 0) + (cartItem.infantQuantity || 0),
              totalPrice: cartItem.totalPrice || cartItem.discountPrice || cartItem.price || 0,
              status: 'Confirmed',
              paymentId: paymentResult.paymentId,
              paymentMethod,
              specialRequests: customer.specialRequests,
              emergencyContact: customer.emergencyContact,
              adultGuests: cartItem.quantity || 1,
              childGuests: cartItem.childQuantity || 0,
              infantGuests: cartItem.infantQuantity || 0,
              selectedAddOns: cartItem.selectedAddOns || {},
            });
            
            createdBookings.push(booking);
          } catch (retryError: any) {
            throw new Error(`Failed to create booking for ${cartItem.title} after retry: ${retryError.message}`);
          }
        } else {
          throw new Error(`Failed to create booking for ${cartItem.title}: ${bookingError.message}`);
        }
      }
    }

    // Generate booking confirmation data
    const mainBooking = createdBookings[0];
    const mainTour = await Tour.findById(mainBooking.tour);
    const bookingId = createdBookings.length === 1 ? mainBooking.bookingReference : `MULTI-${Date.now()}`;
    
    // Send Enhanced Booking Confirmation
    await EmailService.sendBookingConfirmation({
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
      bookingId: bookingId,
      specialRequests: customer.specialRequests,
      meetingPoint: mainTour?.meetingPoint || "Meeting point will be confirmed 24 hours before tour",
      contactNumber: "+20 123 456 7890",
      tourImage: mainTour?.image
    });

    // Send Admin Alert
    await EmailService.sendAdminBookingAlert({
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      tourTitle: cart.length === 1 ? mainTour?.title || 'Tour' : `${cart.length} Tours`,
      bookingId: bookingId,
      bookingDate: mainBooking.date.toLocaleDateString('en-US'),
      totalPrice: `$${pricing.total.toFixed(2)}`,
      paymentMethod: paymentMethod,
      specialRequests: customer.specialRequests,
      adminDashboardLink: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/bookings/${bookingId}`
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking completed successfully!',
      bookingId: bookingId,
      bookings: createdBookings.map(booking => booking._id),
      paymentId: paymentResult.paymentId,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
      },
      ...(isGuest && { 
        guestAccount: true,
        message: 'Booking completed! A temporary account has been created with your email. You can set a password later to access your bookings.',
      }),
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    
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