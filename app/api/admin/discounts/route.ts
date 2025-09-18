import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';
// import { isAdmin } from '@/lib/auth'; // Hypothetical auth check

export async function GET(request: Request) {
  // if (!isAdmin(request)) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }
  
  await dbConnect();

  try {
    const discounts = await Discount.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: discounts });
  } catch (error) {
    console.error('Failed to fetch discounts:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // if (!isAdmin(request)) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }

  await dbConnect();

  try {
    const body = await request.json();
    const newDiscount = await Discount.create(body);
    return NextResponse.json({ success: true, data: newDiscount }, { status: 201 });
  } catch (error) {
    console.error('Failed to create discount:', error);
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}