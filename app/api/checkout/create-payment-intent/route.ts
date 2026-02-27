// app/api/checkout/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';

// Lazy Stripe initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }
  return stripeInstance;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer, pricing, cart, discountCode } = body;

    // Validate required fields
    if (!customer || !pricing || !cart || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing required payment information' },
        { status: 400 }
      );
    }

    // Validate customer data
    if (!customer.email || !customer.firstName || !customer.lastName) {
      return NextResponse.json(
        { success: false, message: 'Please provide complete customer information (name and email)' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Always compute the amount server-side from the cart.
    // This guarantees Stripe amount matches booking summary, even if client pricing is stale.
    await dbConnect();

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const toNumberQty = (value: any, fallback = 0): number => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
      if (value && typeof value === 'object') {
        const inner = (value as any).quantity ?? (value as any).qty ?? (value as any).count;
        return toNumberQty(inner, fallback);
      }
      return fallback;
    };

    const calculateAddOnsTotal = (cartItem: any): number => {
      const totalGuests = (cartItem?.quantity || 0) + (cartItem?.childQuantity || 0);
      let addOnsTotal = 0;

      // Array format
      if (Array.isArray(cartItem?.selectedAddOns)) {
        for (const addon of cartItem.selectedAddOns) {
          const qty = toNumberQty(addon?.quantity, 0);
          if (qty <= 0) continue;
          const price = Number(addon?.price || 0);
          const perGuest = addon?.perGuest ?? false;
          const multiplier = perGuest ? totalGuests : 1;
          addOnsTotal += price * multiplier * (qty || 1);
        }
        return addOnsTotal;
      }

      // Object format (or corrupted object values)
      if (cartItem?.selectedAddOns && typeof cartItem.selectedAddOns === 'object') {
        for (const [addOnId, rawQty] of Object.entries(cartItem.selectedAddOns)) {
          const qty = toNumberQty(rawQty, 0);
          const detail =
            cartItem?.selectedAddOnDetails?.[addOnId] ||
            (rawQty && typeof rawQty === 'object' ? (rawQty as any) : undefined);
          if (!detail || qty <= 0) continue;
          const price = Number((detail as any).price || 0);
          const perGuest = (detail as any).perGuest ?? false;
          const multiplier = perGuest ? totalGuests : 1;
          addOnsTotal += price * multiplier * (qty || 1);
        }
      }

      return addOnsTotal;
    };

    const subtotal = round2((cart || []).reduce((sum: number, item: any) => {
      const basePrice = item?.selectedBookingOption?.price || item?.discountPrice || item?.price || 0;
      const adults = toNumberQty(item?.quantity ?? 1, 1);
      const children = toNumberQty(item?.childQuantity ?? 0, 0);
      const adultPrice = Number(basePrice) * adults;
      const childPrice = (Number(basePrice) / 2) * children;
      return sum + adultPrice + childPrice + calculateAddOnsTotal(item);
    }, 0));

    const serviceFee = round2(subtotal * 0.03);
    const tax = round2(subtotal * 0.05);

    let discount = 0;
    if (discountCode) {
      const d = await Discount.findOne({ code: String(discountCode).toUpperCase() }).lean();
      if (d && d.isActive && (!d.expiresAt || new Date(d.expiresAt) >= new Date()) && (!d.usageLimit || d.timesUsed < d.usageLimit)) {
        discount = d.discountType === 'percentage'
          ? round2((subtotal * d.value) / 100)
          : round2(d.value);
      }
    }

    const total = round2(Math.max(0, subtotal + serviceFee + tax - discount));
    if (!total || total <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    // Prepare cart data for metadata (essential fields only to fit in Stripe's 500 char limit per field)
    // We store tour IDs, quantities, dates, times so webhook can recreate booking if needed
    const cartSummary = cart.map((item: any, index: number) => ({
      i: index, // index
      t: item._id || item.id, // tour ID
      a: item.quantity || 1, // adults
      c: item.childQuantity || 0, // children
      n: item.infantQuantity || 0, // infants
      d: item.selectedDate, // date
      tm: item.selectedTime, // time
      bp: item.selectedBookingOption?.price || item.discountPrice || item.price, // base price
      bo: item.selectedBookingOption?.id, // booking option ID
      bot: item.selectedBookingOption?.title, // booking option title
      // Add-ons (short keys): [{id,q,p,pg,t}]
      ao: (() => {
        const addOns: any[] = [];
        const source = item?.selectedAddOns;
        const details = item?.selectedAddOnDetails || {};
        const pushAddOn = (id: string, q: any) => {
          const qty = toNumberQty(q, 0);
          if (qty <= 0) return;
          const d = details?.[id] || (q && typeof q === 'object' ? q : undefined);
          addOns.push({
            id,
            q: qty,
            p: Number(d?.price || 0),
            pg: d?.perGuest ?? false,
            t: String(d?.title || d?.name || '').slice(0, 40),
          });
        };
        if (Array.isArray(source)) {
          source.forEach((a: any) => pushAddOn(a?.id, a?.quantity));
        } else if (source && typeof source === 'object') {
          Object.entries(source).forEach(([id, q]) => pushAddOn(id, q));
        }
        return addOns;
      })(),
    }));

    // Create a PaymentIntent with Stripe - including full booking data for webhook recovery
    // IMPORTANT: Always charge in USD since all prices are stored in USD
    // The display currency is for user convenience only - Stripe handles card currency conversion
    const stripe = getStripe();
    
    // Prepare hotel pickup location as compressed JSON (if available)
    const hotelPickupLocationJson = customer.hotelPickupLocation 
      ? JSON.stringify({
          lat: customer.hotelPickupLocation.lat,
          lng: customer.hotelPickupLocation.lng,
          name: customer.hotelPickupLocation.name?.substring(0, 100) || '',
          address: customer.hotelPickupLocation.address?.substring(0, 150) || '',
        })
      : '';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe expects amount in cents
      currency: 'usd', // Always charge in USD - prices are stored in USD
      description: `Booking for ${cart.length} tour${cart.length > 1 ? 's' : ''}`,
      metadata: {
        // Customer info
        customer_email: customer.email,
        customer_name: `${customer.firstName} ${customer.lastName}`,
        customer_first_name: customer.firstName,
        customer_last_name: customer.lastName,
        customer_phone: customer.phone || '',
        // Hotel pickup info (essential for operator/admin emails)
        hotel_pickup_details: (customer.hotelPickupDetails || '').substring(0, 300),
        hotel_pickup_location: hotelPickupLocationJson.substring(0, 500),
        // Special requests
        special_requests: (customer.specialRequests || '').substring(0, 500),
        // Tour info
        tours: cart.map((item: any) => item.title).join(', ').substring(0, 500),
        tour_count: String(cart.length),
        // Cart data (JSON compressed - Stripe allows up to 500 chars per value)
        cart_data: JSON.stringify(cartSummary).substring(0, 500),
        // Additional cart data if needed (for multi-tour bookings)
        cart_data_2: JSON.stringify(cartSummary).length > 500 
          ? JSON.stringify(cartSummary).substring(500, 1000) 
          : '',
        // Pricing info
        pricing_subtotal: String(subtotal),
        pricing_service_fee: String(serviceFee),
        pricing_tax: String(tax),
        pricing_discount: String(discount || 0),
        pricing_total: String(total),
        pricing_currency: 'USD', // Always USD - prices are stored and charged in USD
        // Discount
        discount_code: discountCode || 'none',
        // Flag to indicate this has booking data for webhook processing
        has_booking_data: 'true',
      },
      // receipt_email removed - we send our own booking confirmation email
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      pricing: {
        subtotal,
        serviceFee,
        tax,
        discount,
        total,
        currency: 'USD', // Always USD - prices are stored and charged in USD
      },
    });

  } catch (error: any) {
    console.error('Create PaymentIntent error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to initialize payment. Please try again.';

    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment request. Please check your information and try again.';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again in a moment.';
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Payment configuration error. Please contact support.';
      console.error('STRIPE AUTHENTICATION ERROR - Check API keys!');
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
