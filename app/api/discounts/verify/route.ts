import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
    }

    // Find the discount code (case-insensitive)
    const discount = await Discount.findOne({ code: code.toUpperCase() });

    // Check if the discount exists
    if (!discount) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 404 });
    }

    // Check if the discount is currently active
    if (!discount.isActive) {
      return NextResponse.json({ success: false, error: 'This coupon is no longer active' }, { status: 400 });
    }

    // Check if the discount has expired
    if (discount.validUntil && new Date(discount.validUntil) < new Date()) {
      // Optionally, you could also update the isActive status in the database here
      // await Discount.updateOne({ _id: discount._id }, { $set: { isActive: false } });
      return NextResponse.json({ success: false, error: 'This coupon has expired' }, { status: 400 });
    }
    
    // Future enhancement: Add checks for usage limits if you add that to your model
    // if (discount.usageLimit && discount.timesUsed >= discount.usageLimit) {
    //   return NextResponse.json({ success: false, error: 'This coupon has reached its usage limit' }, { status: 400 });
    // }

    // If all checks pass, return the discount data
    return NextResponse.json({ success: true, data: discount });

  } catch (error) {
    console.error('Error verifying discount:', error);
    // Return a generic server error to the client
    return NextResponse.json({ success: false, error: 'An internal server error occurred' }, { status: 500 });
  }
}